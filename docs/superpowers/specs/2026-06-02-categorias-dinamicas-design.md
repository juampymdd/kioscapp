# Categorías dinámicas con íconos — KioscApp

Fecha: 2026-06-02
Estado: aprobado (enfoque A)

## Contexto

Hoy las categorías son un enum fijo de 7 valores (`CategoriaProducto` en
`packages/shared/src/types/producto.ts`), con mapas hardcodeados de label, orden e ícono
repartidos por la app. El usuario quiere **crear/editar/borrar categorías** con un
**selector de íconos lucide** (la mayor cantidad posible) y que se administren tanto en el
**desktop como en la web, sincronizadas**.

Resultado esperado: categoría = dato (no código). CRUD en ambos lados, ícono lucide por
categoría, sin romper productos/ventas/descuentos existentes.

## Decisión clave: id = slug (retrocompatible, cero migración)

El `id` de cada categoría es un **slug string**. Las 7 actuales se siembran con `id` igual a
su valor de hoy (`cigarrillos`, `bebidas`, `golosinas`, `kiosco`, `recarga_sube`,
`recarga_celular`, `varios`). Como `productos.categoria`, `venta_items.categoria` y
`descuentos.categoria` ya guardan esos strings, **siguen matcheando sin migrar datos**.
Categorías nuevas: slug derivado del nombre (`normalizarSlug`), con sufijo si colisiona.

`CategoriaProducto` pasa de unión literal a alias `string` (transparente para el resto).

## 1. Modelo — tabla `categorias`

Local (SQLite) y backend (Drizzle), con los `syncFields` del proyecto:

| campo | tipo | nota |
|---|---|---|
| `id` | text pk | slug |
| `nombre` | text | label visible |
| `icono` | text | nombre lucide PascalCase (ej `Cigarette`); default `Package` |
| `color` | text null | acento opcional (token/hex) |
| `orden` | int | orden en grid y ticket |
| `activo` | bool | default true |
| `created_at`/`updated_at`/`local_id`/`sync_status`/`deleted_at` | | sync |

Tipo compartido nuevo `packages/shared/src/types/categoria.ts` (`Categoria`), reexport en
`index.ts`. `CATEGORIA_LABEL`/`CATEGORIA_ORDEN` quedan solo como **defaults de seed**
(constante `CATEGORIAS_SEED`), no como fuente de verdad en runtime.

## 2. IconPicker (lo central del pedido)

- Componente `IconPicker` (uno en desktop, uno en backend; lucide-react en ambos).
- Lista el **set completo** de `lucide-react` vía `import { icons } from 'lucide-react'`
  (~1500). Grid buscable por nombre; render **paginado/virtualizado** (mostrar primeros N +
  filtro por search) para no colgar.
- Devuelve el nombre PascalCase del ícono.
- Helper `CategoriaIcon({ name, ...props })`: resuelve `icons[name]`, fallback `Package`.
  Reemplaza el `CATEGORIA_ICONS` hardcodeado de `ProductGrid`.

## 3. Pantallas CRUD

- **Desktop**: nuevo ítem en `Sidebar` ("Categorías", ScreenId `categorias`) → pantalla
  `CategoriasScreen` con lista + form (nombre, IconPicker, color, orden, activar/borrar).
  Tras guardar, refresca el catálogo local que consumen grid/carrito.
- **Web**: página `app/dashboard/categorias/page.tsx` con la misma CRUD + IconPicker.

## 4. Store local + lectura

- Migración SQLite: tabla `categorias` (idempotente; `init()` ya tolera duplicados).
- `SqliteDataStore`: `getCategorias()` (activas, orden), `getAllCategorias()`,
  `upsertCategoria(c)`, `eliminarCategoria(id)` (soft-delete). `mapCategoria`.
- `dataStore.ts`: agregar esos métodos a la interfaz.
- Consumidores (`ProductGrid`, `ProductosScreen` select, `PromocionesScreen`,
  descuentos dashboard) leen categorías de la DB en vez de listas fijas.

## 5. Sync (desktop ↔ central)

- Backend `schema.ts`: tabla `categorias` (`db:push`).
- `GET /api/catalog`: incluir `categorias` en la respuesta (junto a productos/stock).
- `POST /api/sync/ingest` o `/api/catalog` POST: aceptar `categorias` (push de locales).
- Desktop `syncEngine.pullCatalogo`: upsert de `categorias` bajadas; push de `categorias`
  pendientes en `pushPendientes` (agregar `categorias` a `getPendientesSincronizacion`).
- Backend dashboard CRUD escribe directo en la tabla (igual patrón que descuentos).

## 6. Ticket (agrupado dinámico)

- **TS `buildLineas`**: en vez de `CATEGORIA_ORDEN`/`CATEGORIA_LABEL` fijos, recibir en
  `DatosTicket` una lista `categorias: { id; nombre; orden }[]` y agrupar/ordenar por ella.
  Ítems cuya categoría ya no exista → al final, label = el id.
- **Rust `build_escpos`**: hoy agrupa por `CATEGORIA_ORDEN` fijo. Pasa a recibir las
  categorías (id, nombre, orden) en el payload `DatosTicket` y agrupar genérico.
- `PaymentModal` y `VentasScreen` (reimpresión) arman `DatosTicket.categorias` desde
  `getCategorias()`.

## Verificación

- Typecheck: `pnpm --filter @kioscapp/shared typecheck`, desktop `tsc --noEmit`, backend
  `typecheck`. Rust: `cargo check`.
- Seed: arranque limpio crea las 7 categorías; productos existentes siguen agrupados.
- CRUD desktop: crear categoría con ícono lucide → aparece en el grid (chip + ícono) y se
  puede asignar a un producto; editar/desactivar/borrar refresca.
- IconPicker: buscar "coffee" filtra y muestra el ícono; al elegirlo se guarda el nombre.
- Sync: crear categoría en la web → tras pull aparece en el desktop; crear en desktop →
  tras push aparece en la web.
- Ticket: vender productos de ≥2 categorías (incluida una nueva) → agrupa y ordena bien en
  preview y en impresión 58/80 mm; reimpresión conserva.

## Notas

- Slug evita migración: defaults con id = enum viejo.
- Render de 1500 íconos: filtrar por búsqueda + paginar; nunca montar todos a la vez.
- `categorias` append-friendly: borrar = soft-delete (`deleted_at`), no rompe ventas viejas.
- Backend Next con breaking changes: leer `node_modules/next/dist/docs/` antes de tocar
  rutas/dashboard; Context7 para libs.
