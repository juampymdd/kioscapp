# Consola de administración web (multi-tienda) — KioscApp

Fecha: 2026-06-03 · Estado: aprobado ("hacé todo")

## Contexto
La web hoy solo muestra básicos + CRUD suelto. El dueño necesita administrar toda la
cadena desde la web: monitorear ventas, controlar stock por sucursal, catálogo y precios,
cajas/arqueos, proveedores y compras. La data de ventas/cajas/movimientos ya sincroniza al
central; stock y precios necesitan ajustes de modelo/sync.

## Decisiones de modelo
- **Stock por punto de venta**: `stock.local_id` ya existe. Fix de sync: `ingest` acepta
  stock; el pull de catálogo devuelve **solo el stock del propio punto de venta** (no global).
  La web agrega por sucursal (join `puntos_venta → sucursales`).
- **Precio por sucursal (opcional)**: tabla `precios_sucursal (sucursal_id, producto_id,
  precio_centavos)`. El desktop usa el override de SU sucursal si existe; si no, el precio base.
- Ventas/cajas/movimientos: ya suben → monitoreo sin cambio de modelo.

## Módulos / Fases
- **F1 Monitoreo** (web, sin cambio de modelo):
  - `/dashboard/ventas`: historial global, filtros (sucursal, caja, medio, período), detalle
    ítems+descuentos. API scopeada por user (join pv→sucursal).
  - `/dashboard/cajas`: turnos por sucursal/caja, apertura/cierre, esperado vs contado
    (diferencia), movimientos del turno (ventas, descuentos, ingresos/egresos).
  - Analítica (Resumen): filtro por sucursal + comparativa.
- **F2 Stock por sucursal**: sync fix (ingest stock + pull filtra por local_id); `/dashboard/stock`
  nivel por sucursal, alertas de faltante, ajuste manual (que sube como movimiento de stock).
- **F3 Precio por sucursal**: tabla `precios_sucursal` + UI en catálogo (precio base + overrides);
  desktop resuelve precio efectivo por sucursal; pull baja overrides de la sucursal.
- **F4 Compras/reposición**: tabla `compras` + items; registrar compra a proveedor que **suma
  stock** a una sucursal; `/dashboard/compras`.
- Usuarios/permisos: futuro.

## Navegación web
Header: Resumen · Ventas · Cajas · Stock · Catálogo (Productos/Categorías/Proveedores/Precios) ·
Compras · Promociones · Sucursales.

## Verificación
Por fase: `pnpm --filter backend typecheck` + `build`; desktop `tsc`/`cargo` cuando aplica;
`db:push` para tablas/columnas nuevas; E2E manual (cargar/ver por sucursal); deploy a Vercel.

## Notas
- Multi-tenant: filtrar por `user_id` (vía sucursales del dueño) en todas las queries de admin.
- Centavos siempre; soft-delete; sync append-friendly.
