# Sistema de descuentos — KioscApp

Fecha: 2026-06-02
Estado: aprobado

## Contexto

El ticket ya se agrupa por categoría y `venta_items.descuento_centavos` existe (Fase 1),
pero hoy siempre vale 0: no hay forma de cargar ni aplicar descuentos. Los dueños
necesitan descuentos en tres formas simultáneas:

1. **Manual en la venta** — el cajero descuenta en el momento (por ítem y/o sobre el total).
2. **Por sucursal** — catálogo de descuentos propio de cada sucursal.
3. **Global** — catálogo central que aplica a todas las sucursales.

Resultado esperado: el cajero aplica descuentos rápido y sin errores; los dueños cargan
promos desde el dashboard; todo funciona **offline** (regla de dominio: offline es normal)
y queda **congelado en centavos** en el `venta_item` (regla: append-only, importes en
centavos, sin recálculo al reimprimir).

## Arquitectura existente reusada

- Productos bajan del backend al desktop vía `pullCatalogo` (`apps/desktop/src/lib/syncEngine.ts`
  → `GET /api/catalog`). ⇒ `producto_id` es consistente entre dashboard y desktop, así que
  los descuentos por producto del catálogo matchean sin gap de identidad.
- Sync de ventas autenticado: `apps/desktop/src/services/syncService.ts` usa `localId` +
  `x-sync-secret` contra `/api/puntos-venta/[id]/...`. Patrón a replicar para bajar descuentos.
- Carrito: `apps/desktop/src/store/cartStore.ts` (ya tiene `descuento_centavos` global de venta).
- Cobro/armado de venta: `apps/desktop/src/components/PaymentModal.tsx`.
- Ticket: `apps/desktop/src/lib/ticket.ts` + `apps/desktop/src-tauri/src/print.rs` (línea
  `-$x` por ítem y `DESCUENTO:` global ya soportadas en Fase 1).
- Backend Drizzle: `apps/backend/src/db/schema.ts`. `puntos_venta.id` = `local_id`,
  `sucursales` agrupa puntos de venta, `users` es el dueño. Dashboard en `apps/backend/app/dashboard`.
- ⚠️ `apps/backend/AGENTS.md`: Next.js con breaking changes — leer `node_modules/next/dist/docs/`
  antes de tocar rutas/dashboard. Para libs usar Context7 MCP.

Reglas de UI a respetar (DESIGN.md / PRODUCT.md): tema oscuro plano, azul = único color
accionable, semánticos solo para estado, doble canal (color + ícono/texto), targets ≥44px,
sentence case, importes en centavos, castellano rioplatense con verbo+objeto.

## 1. Modelo de datos — tabla `descuentos`

Tanto en backend (Drizzle, Postgres) como local (SQLite). Campos:

| campo | tipo | nota |
|---|---|---|
| `id` | text pk (UUID) | |
| `user_id` | text | dueño (solo backend; en local se omite/no se usa) |
| `sucursal_id` | text null | **NULL = global**; si tiene valor, aplica solo a esa sucursal |
| `objetivo` | text | `'producto'` \| `'categoria'` |
| `producto_id` | text null | requerido si `objetivo='producto'` |
| `categoria` | text null | requerido si `objetivo='categoria'` (uno de `CategoriaProducto`) |
| `tipo` | text | `'monto'` \| `'porcentaje'` |
| `valor` | integer | `monto` = centavos; `porcentaje` = entero 1..100 |
| `activo` | boolean | default true |
| `created_at` / `updated_at` | text ISO | |
| `deleted_at` | text null | soft-delete |

`venta_items.descuento_centavos` (ya existe) guarda el **resultado efectivo congelado**.
`ventas.descuento_centavos` (ya existe) guarda el **descuento global manual** de la venta.

Tipo compartido nuevo en `packages/shared/src/types/descuento.ts` (`Descuento`, `ObjetivoDescuento`,
`TipoDescuento`), reexport en `index.ts`.

## 2. Resolver (función pura — fuente única de verdad)

`packages/shared/src/descuentos.ts`:

```
resolverDescuentoItem(
  item: { producto_id; categoria; subtotal_centavos },
  manual_centavos: number | null,
  catalogo: Descuento[],   // activos, ya scopeados a esta sucursal/global
): number   // centavos a descontar (>= 0, <= subtotal)
```

Reglas (gana uno, **no acumula**):
1. Si `manual_centavos != null` → gana el manual.
2. Si no, buscar en catálogo el de mayor prioridad que matchee:
   - **scope**: `sucursal` (sucursal_id de este PV) > `global` (sucursal_id NULL).
   - **objetivo** dentro del scope: `producto` (producto_id) > `categoria`.
   - Tomar el primero por ese orden; no combinar.
3. Calcular centavos: `monto` → `valor`; `porcentaje` → `floor(subtotal * valor / 100)`.
4. Clamp `0 <= desc <= subtotal_centavos`.

Función pura, testeable aislada (sin DB ni red). Tests unitarios en shared.

## 3. Carrito + UI de cobro (desktop)

- `cartStore.CartItem` += `descuentoManual_centavos: number | null` y `descuento_centavos`
  (efectivo resuelto). Acciones: `setDescuentoManualItem(productoId, centavos|null)`.
- Recalcular `descuento_centavos` de cada ítem (vía resolver) al: agregar, cambiar cantidad,
  cargar/actualizar catálogo de descuentos.
- Descuento global de venta: se mantiene `cartStore.setDescuento` / `descuento_centavos`.
- `total()` = `Σ(subtotal_i − descuento_i) − descuento_global`, clamp `>= 0`.
- **UI por ítem**: en cada línea del carrito, botón chico `%/$` (azul, accionable) → popover
  para setear monto o porcentaje del descuento manual de ese ítem. Mostrar el `-$x` aplicado.
- **UI global**: campo "Descuento" en `PaymentModal` (sobre el total), con monto o %.
- Estilo: respetar DESIGN.md (plano, azul accionable, sentence case, target ≥44px).

## 4. Congelado al vender

En `PaymentModal.confirmar`, cada `venta_item.descuento_centavos` = `item.descuento_centavos`
(efectivo ya resuelto en el carrito). `venta.descuento_centavos` = descuento global manual.
El ticket ya imprime `-$x` por ítem y `DESCUENTO:` global (Fase 1). Nada recalcula al reimprimir.

## 5. Backend + pull

**Backend:**
- Tabla `descuentos` en `schema.ts` (+ `db:push`; no hay carpeta `drizzle/`, el proyecto usa push).
- `GET /api/puntos-venta/[id]/descuentos` (auth `x-sync-secret`, igual que `ventas`): resuelve
  la sucursal del PV (`puntos_venta.sucursal_id`) y su dueño; devuelve descuentos `activo`,
  `deleted_at IS NULL`, que sean globales del user **o** de esa sucursal.
- Dashboard: pantalla CRUD de descuentos bajo `app/dashboard` (alta/baja/edición; elegir
  ámbito global/sucursal, objetivo producto/categoría, tipo monto/%, valor, activo).
  Selección de producto desde la lista de `productos`. Reusar patrones de
  `app/dashboard/sucursales/[id]`.

**Desktop:**
- Migración local: tabla `descuentos` (idempotente; el loop de `init()` corre todo en cada
  arranque y ya ignora "duplicate column").
- `SqliteDataStore`: `upsertDescuento`, `getDescuentosActivos`.
- `syncService`: `pullDescuentos()` (localId + secret) → upsert local; cachear y exponer al
  carrito. Llamar en el ciclo de sync.
- El resolver del carrito lee `getDescuentosActivos()` desde la cache local (offline-friendly).

## Verificación

- **Unit (shared)**: tests de `resolverDescuentoItem` cubriendo prioridades (manual > sucursal >
  global; producto > categoria), monto vs %, clamp a subtotal, sin match → 0.
- **Typecheck**: `npx tsc --noEmit` en `packages/shared`, `apps/desktop`, `apps/backend`.
  Rust: `cargo check` en `apps/desktop/src-tauri`.
- **E2E manual** (`npm run tauri dev` en `apps/desktop`, backend con `db:push` aplicado):
  - Manual por ítem: setear `-$x` y `-%` → baja el total y aparece línea `-$x` en el ticket.
  - Manual global: campo en cobro → línea `DESCUENTO:` en totales.
  - Catálogo: crear descuento global y uno de sucursal en el dashboard → tras el pull, una
    venta nueva aplica con prioridad correcta (manual > sucursal > global; producto > categoría)
    y queda congelado (reimprimir lo conserva).
  - Backend: `/api/puntos-venta/[id]/descuentos` responde scopeado y autenticado.

## Notas / decisiones

- Importes en centavos siempre (regla de dominio). `porcentaje` como entero 1..100 (v1; se
  puede extender a decimales luego sin romper el congelado, que ya es en centavos).
- No acumular descuentos evita totales negativos y regalar productos; igual se clampa.
- `venta_items` append-only: el descuento se congela al vender; reimpresión nunca recalcula.
