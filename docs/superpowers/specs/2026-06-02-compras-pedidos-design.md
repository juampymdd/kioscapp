# Compras / Pedidos a proveedores — Diseño

## Context

Hoy `ProveedoresScreen` solo guarda contacto (nombre/tel/email/notas) y ahí muere: cargás un proveedor y no sirve para nada. Los sistemas de kiosco reales usan al proveedor como punta del flujo de **reposición/compras**. Queremos cerrar ese flujo: vincular productos a sus proveedores con su costo, ver qué falta agrupado por proveedor, armar el pedido, mandarlo/imprimirlo, guardarlo y, al llegar la mercadería, marcarlo recibido para que sume el stock.

Decisiones tomadas (brainstorm):
- Producto ↔ proveedor es **muchos-a-muchos**; el **costo es por par** (producto+proveedor), para comparar quién es más barato.
- El **precio de venta lo pone el dueño a mano** (sin margen automático). El costo es informativo / para valorizar el pedido.
- Lista de "qué pedir" en **pantalla Reposición nueva** + también en el **detalle del proveedor**.
- Pedido con **cantidad editable** (arranca en el faltante).
- Salidas del pedido: **copiar/WhatsApp + imprimir + ver en pantalla**.
- Pedido se **guarda** (historial) con **estado**; al **marcar recibido suma stock**.

## Construcción por fases

Cada fase aporta valor sola; el plan de implementación las ordena así:
- **F1 — Vínculo + Reposición + armar pedido:** `producto_proveedores` (+costo), asignación en Productos, pantalla Reposición agrupada por proveedor, armar pedido con cantidades, salidas (copiar/imprimir/ver). Sin guardar todavía.
- **F2 — Pedidos guardados + recibir:** tablas `pedidos`/`pedido_items`, historial con estado, **Marcar recibido → suma stock**.
- **F3 — Sync al backend:** consolidación de vínculos y pedidos en Postgres (offline-first; los pedidos viven local y se suben cuando hay conexión).

## Modelo de datos

Nuevos tipos en `packages/shared/src/types/` + tabla SQLite (`apps/desktop/src/lib/migrations.ts`, **append al final**) + Postgres (`apps/backend/src/db/schema.ts`). Todos con los `SyncFields` del proyecto.

- **`producto_proveedores`** — vínculo + costo
  - `id`, `producto_id`, `proveedor_id`, `costo_centavos` (entero, nunca float), + sync fields (`local_id`, `sync_status`, `created_at`, `updated_at`, `deleted_at`).
  - Único lógico por (`producto_id`, `proveedor_id`).
- **`pedidos`** — orden de compra a un proveedor
  - `id`, `proveedor_id`, `estado` (`'pendiente' | 'recibido'`), `total_centavos`, `recibido_at` (nullable), + sync fields.
- **`pedido_items`** — append-only, snapshots
  - `id`, `pedido_id`, `producto_id`, `descripcion` (snapshot), `cantidad` (real), `costo_unit_centavos` (snapshot), `subtotal_centavos`, + `created_at`/`local_id`/`sync_status`.

Métodos nuevos en `DataStore` / `SqliteDataStore` (espejo de los patrones existentes `upsertProducto`, `setStock`, `crearVenta`):
- Vínculos: `getProveedoresDeProducto(productoId)`, `setProveedoresDeProducto(productoId, [{proveedorId, costo}])`, `getProductosDeProveedor(proveedorId)`.
- Reposición: `getReposicion()` → productos con `stock.cantidad <= stock.alerta_minimo`, con sus proveedores y costo.
- Pedidos: `crearPedido(pedido, items)`, `getPedidos(filtro?)`, `getPedidoItems(pedidoId)`, `marcarPedidoRecibido(pedidoId)` (set estado/recibido_at + `incrementarStock` por cada ítem, en una pasada).

## Pantallas y flujo

1. **Productos (editar)** — `apps/desktop/src/screens/ProductosScreen.tsx`
   Nueva sección "Proveedores": elegir uno o varios proveedores y, por cada uno, su **costo** (MoneyInput). Persiste en `producto_proveedores` al guardar.

2. **Reposición (nueva)** — `apps/desktop/src/screens/ReposicionScreen.tsx` + ítem en `Sidebar` (`ScreenId` `'reposicion'`, ícono `ClipboardList`) + ruta en `App.tsx`.
   - Usa `ScreenHeader` (identidad consistente).
   - Lista productos con stock ≤ alerta **agrupados por proveedor**; un producto con varios proveedores aparece bajo cada uno con el costo de ese proveedor.
   - Por proveedor: cada ítem con **cantidad editable** (default `max(alerta - actual, 1)`), subtotal = cantidad×costo, total del proveedor.
   - Botón **Armar pedido** (por proveedor) → crea pedido *pendiente* con los ítems marcados.

3. **Armar pedido / acciones** — modal o panel:
   - **Copiar / WhatsApp:** texto tipo `Pedido a <prov> (<fecha>):\n- 3x Coca 500ml\n- 5x Sprite\nTotal aprox: $X` vía portapapeles.
   - **Imprimir:** ESC/POS por la impresora ya configurada. Reusa el canal de impresión raw (`imprimir_ticket`/`print.rs`); se agrega un formateador de pedido en `apps/desktop/src/lib/` (espejo de `ticket.ts`) y, si hace falta, un comando `imprimir_texto` genérico en Rust.
   - Queda **guardado** (F2).

4. **Pedidos (historial)** — pestaña en Reposición y/o lista en el detalle del proveedor:
   - Lista por proveedor/fecha + **estado** (pendiente/recibido) con badge tintado (estilo del DESIGN.md).
   - **Marcar recibido** → `marcarPedidoRecibido` suma stock de cada ítem y deja el pedido en *recibido*.

5. **Proveedor (detalle)** — `ProveedoresScreen.tsx`: agregar sus **productos a reponer** + sus **pedidos**.

## Reutilización
- `ScreenHeader`, badges tintados, tokens slate/blue (DESIGN.md) — toda pantalla nueva.
- `MoneyInput` para costos y cantidades.
- Patrón de impresión existente (`print.rs` + `imprimir_ticket`) para imprimir el pedido.
- `incrementarStock` / `setStock` ya existentes en `SqliteDataStore` para "recibir".
- Migraciones: append al final del array en `migrations.ts` (tauri-plugin-sql versiona por orden); `ALTER`/`CREATE` idempotentes como el resto.

## Reglas de dominio
- Importes (costo, subtotal, total) **en centavos**, enteros.
- Cantidades `real` (fraccionables permitidos).
- IDs UUID desde el cliente.
- Snapshots en `pedido_items` (descripción y costo al momento del pedido) — no se recalculan si el producto cambia después.

## Fuera de alcance
- Cuenta corriente con proveedores / pagos.
- Margen automático venta = costo × markup (la venta la pone el dueño).
- Recepción parcial de un pedido (recibido es todo-o-nada).
- Multi-moneda.

## Verificación
1. `pnpm --filter desktop typecheck` + `pnpm --filter backend typecheck` sin errores; `cargo check` si se toca Rust.
2. Flujo F1: cargar 2 proveedores a un producto con costos distintos → Reposición lo muestra bajo ambos con su costo; armar pedido → copiar da el texto correcto, imprimir saca el pedido.
3. Flujo F2: guardar pedido → aparece en historial *pendiente*; Marcar recibido → stock sube por la cantidad pedida y el pedido queda *recibido*.
4. F3: con backend corriendo, el pedido sincroniza (aparece en Postgres) al volver la conexión.
