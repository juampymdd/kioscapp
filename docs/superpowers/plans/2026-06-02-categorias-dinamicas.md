# Categorías dinámicas con íconos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Categorías administrables (CRUD) con ícono lucide, sincronizadas desktop↔web, sin migrar datos existentes (id = slug).

**Architecture:** Tabla `categorias` (local + backend) con id slug; las 7 actuales se siembran con id = su enum viejo → retrocompat total. `CategoriaProducto` → alias `string`. IconPicker sobre el set completo de lucide-react. Grid/ticket/descuentos leen categorías de DB. Sync por el pipeline de catálogo existente.

**Tech Stack:** pnpm + turbo · TS · React · Zustand · Tauri/Vite (SQLite) · Rust ESC/POS · Next 16 · Drizzle/Postgres · lucide-react · vitest.

---

## Estructura de archivos

**Crear:**
- `packages/shared/src/types/categoria.ts` — tipo `Categoria` + `CATEGORIAS_SEED`.
- `packages/shared/src/slug.ts` + `slug.test.ts` — `normalizarSlug`.
- `apps/desktop/src/components/IconPicker.tsx` — selector lucide.
- `apps/desktop/src/components/CategoriaIcon.tsx` — render por nombre.
- `apps/desktop/src/screens/CategoriasScreen.tsx` — CRUD desktop.
- `apps/backend/app/dashboard/categorias/page.tsx` — CRUD web.
- `apps/backend/app/dashboard/_components/IconPicker.tsx` — selector lucide (web).
- `apps/backend/app/api/categorias/route.ts` + `[id]/route.ts` — CRUD web.

**Modificar:**
- `packages/shared/src/types/producto.ts` — `CategoriaProducto = string`; mover labels a seed.
- `packages/shared/src/index.ts` — exports.
- `apps/desktop/src/lib/migrations.ts` — tabla `categorias`.
- `apps/desktop/src/store/dataStore.ts` + `SqliteDataStore.ts` — CRUD categorías.
- `apps/desktop/src/lib/seeder.ts` — sembrar categorías.
- `apps/desktop/src/components/ProductGrid.tsx`, `screens/ProductosScreen.tsx`,
  `screens/PromocionesScreen.tsx` — leer categorías de DB + CategoriaIcon.
- `apps/desktop/src/components/Sidebar.tsx`, `App.tsx` — ruta Categorías.
- `apps/desktop/src/lib/ticket.ts` + `components/TicketModal.tsx` + `components/PaymentModal.tsx`
  + `screens/VentasScreen.tsx` — `DatosTicket.categorias` dinámico.
- `apps/desktop/src-tauri/src/print.rs` — agrupar por categorías del payload.
- `apps/desktop/src/lib/syncEngine.ts` — pull+push categorías.
- `apps/backend/src/db/schema.ts` — tabla `categorias`.
- `apps/backend/app/api/catalog/route.ts` + `app/api/sync/ingest/route.ts` — categorías.
- `apps/backend/app/dashboard/descuentos/page.tsx` — leer categorías de la API.

---

## Fase A — Shared: tipo, slug, seed

### Task 1: Tipo Categoria + seed + CategoriaProducto=string

**Files:** Create `packages/shared/src/types/categoria.ts`; Modify `producto.ts`, `index.ts`.

- [ ] **Step 1:** Crear `categoria.ts`:

```typescript
import type { SyncFields } from './sync'

export interface Categoria extends SyncFields {
  nombre: string
  icono: string        // nombre lucide PascalCase, ej 'Cigarette'
  color: string | null
  orden: number
  activo: boolean
}

/** Defaults sembrados al iniciar. id = slug (retrocompat con el enum viejo). */
export const CATEGORIAS_SEED: { id: string; nombre: string; icono: string; orden: number }[] = [
  { id: 'cigarrillos',     nombre: 'Cigarrillos', icono: 'Cigarette',  orden: 1 },
  { id: 'bebidas',         nombre: 'Bebidas',     icono: 'GlassWater', orden: 2 },
  { id: 'golosinas',       nombre: 'Golosinas',   icono: 'Candy',      orden: 3 },
  { id: 'kiosco',          nombre: 'Kiosco',      icono: 'ShoppingBag',orden: 4 },
  { id: 'recarga_sube',    nombre: 'SUBE',        icono: 'Bus',        orden: 5 },
  { id: 'recarga_celular', nombre: 'Celular',     icono: 'Smartphone', orden: 6 },
  { id: 'varios',          nombre: 'Varios',      icono: 'Package',    orden: 7 },
]
```

- [ ] **Step 2:** En `producto.ts`, reemplazar la unión por alias y dejar los mapas como derivados del seed (para no romper imports existentes de `CATEGORIA_LABEL`/`CATEGORIA_ORDEN`):

```typescript
/** Id de categoría (slug). Antes era una unión fija; ahora las categorías son dato. */
export type CategoriaProducto = string

// Derivados del seed — solo fallback/compat. La fuente de verdad es la tabla `categorias`.
import { CATEGORIAS_SEED } from './categoria'
export const CATEGORIA_LABEL: Record<string, string> =
  Object.fromEntries(CATEGORIAS_SEED.map(c => [c.id, c.nombre]))
export const CATEGORIA_ORDEN: string[] = CATEGORIAS_SEED.map(c => c.id)
```

- [ ] **Step 3:** `index.ts` += `export * from './types/categoria'` y `export * from './slug'`.

- [ ] **Step 4:** Commit `feat(shared): tipo Categoria + seed, CategoriaProducto=string`.

### Task 2: Slug util (TDD)

**Files:** Create `packages/shared/src/slug.ts`, `slug.test.ts`.

- [ ] **Step 1:** Test:

```typescript
import { describe, it, expect } from 'vitest'
import { normalizarSlug } from './slug'

describe('normalizarSlug', () => {
  it('minúsculas, sin acentos, guiones bajos', () => {
    expect(normalizarSlug('Bebidas Frías')).toBe('bebidas_frias')
  })
  it('colapsa separadores y recorta', () => {
    expect(normalizarSlug('  Pan / Factura  ')).toBe('pan_factura')
  })
  it('vacío → "categoria"', () => {
    expect(normalizarSlug('!!!')).toBe('categoria')
  })
})
```

- [ ] **Step 2:** Correr → falla. `pnpm --filter @kioscapp/shared test`

- [ ] **Step 3:** Impl `slug.ts`:

```typescript
/** Slug ASCII en snake_case para id de categoría. */
export function normalizarSlug(s: string): string {
  const base = s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return base || 'categoria'
}
```

- [ ] **Step 4:** Correr → pasa.

- [ ] **Step 5:** Commit `feat(shared): normalizarSlug con tests`.

---

## Fase B — Desktop: persistencia + seed

### Task 3: Migración + store de categorías

**Files:** Modify `migrations.ts`, `dataStore.ts`, `SqliteDataStore.ts`.

- [ ] **Step 1:** Migración al final del array `migrations`:

```typescript
  {
    description: 'Tabla categorias — Fase 4',
    sql: `
      CREATE TABLE IF NOT EXISTS categorias (
        id           TEXT PRIMARY KEY,
        nombre       TEXT NOT NULL,
        icono        TEXT NOT NULL DEFAULT 'Package',
        color        TEXT,
        orden        INTEGER NOT NULL DEFAULT 100,
        activo       INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL DEFAULT '',
        updated_at   TEXT NOT NULL DEFAULT '',
        local_id     TEXT NOT NULL DEFAULT '',
        sync_status  TEXT NOT NULL DEFAULT 'pending',
        deleted_at   TEXT
      );
    `,
  },
```

- [ ] **Step 2:** `dataStore.ts` interfaz, agregar:

```typescript
  // ── Categorías ─────────────────────────────────────────────────────────────
  getCategorias(): Promise<Categoria[]>        // activas, por orden
  getAllCategorias(): Promise<Categoria[]>
  upsertCategoria(c: Categoria): Promise<void>
  eliminarCategoria(id: string): Promise<void>
```
(y `import type { Categoria } from '@kioscapp/shared'`).

- [ ] **Step 3:** `SqliteDataStore.ts`: import `Categoria`; mapper + métodos:

```typescript
function mapCategoria(r: Row): Categoria {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    icono: (r.icono as string) ?? 'Package',
    color: (r.color as string | null) ?? null,
    orden: (r.orden as number) ?? 100,
    activo: (r.activo as number) === 1,
    created_at: (r.created_at as string) ?? '',
    updated_at: (r.updated_at as string) ?? '',
    local_id: (r.local_id as string) ?? '',
    sync_status: (r.sync_status as 'pending' | 'synced') ?? 'pending',
    deleted_at: (r.deleted_at as string | null) ?? null,
  }
}
```

```typescript
  async getCategorias(): Promise<Categoria[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM categorias WHERE activo=1 AND deleted_at IS NULL ORDER BY orden, nombre`)
    return rows.map(mapCategoria)
  }
  async getAllCategorias(): Promise<Categoria[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM categorias WHERE deleted_at IS NULL ORDER BY orden, nombre`)
    return rows.map(mapCategoria)
  }
  async upsertCategoria(c: Categoria): Promise<void> {
    await this.db.execute(
      `INSERT INTO categorias (id,nombre,icono,color,orden,activo,created_at,updated_at,local_id,sync_status,deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre, icono=excluded.icono,
         color=excluded.color, orden=excluded.orden, activo=excluded.activo,
         updated_at=excluded.updated_at, sync_status=excluded.sync_status, deleted_at=excluded.deleted_at`,
      [c.id, c.nombre, c.icono, c.color, c.orden, c.activo ? 1 : 0, c.created_at, c.updated_at,
       c.local_id, c.sync_status, c.deleted_at])
  }
  async eliminarCategoria(id: string): Promise<void> {
    await this.db.execute(
      `UPDATE categorias SET deleted_at=$1, sync_status='pending', updated_at=$1 WHERE id=$2`,
      [now(), id])
  }
```

- [ ] **Step 4:** Typecheck desktop. Commit `feat(desktop): tabla y store de categorías`.

### Task 4: Seed de categorías

**Files:** Modify `apps/desktop/src/lib/seeder.ts`.

- [ ] **Step 1:** Leer `seeder.ts`. Agregar (antes/junto al seed de productos) siembra idempotente:

```typescript
import { CATEGORIAS_SEED } from '@kioscapp/shared'
// dentro de seedIfEmpty, si no hay categorías:
const cats = await store.getAllCategorias()
if (cats.length === 0) {
  const ts = new Date().toISOString()
  for (const c of CATEGORIAS_SEED) {
    await store.upsertCategoria({
      ...c, color: null, activo: true, created_at: ts, updated_at: ts,
      local_id: LOCAL_ID, sync_status: 'synced', deleted_at: null,
    })
  }
}
```
(usar el `LOCAL_ID` que ya define el seeder).

- [ ] **Step 2:** Typecheck. Commit `feat(desktop): seed de categorías por defecto`.

---

## Fase C — Desktop: IconPicker + pantalla CRUD

### Task 5: CategoriaIcon + IconPicker

**Files:** Create `CategoriaIcon.tsx`, `IconPicker.tsx`.

- [ ] **Step 1:** `CategoriaIcon.tsx`:

```tsx
import { icons, Package, type LucideProps } from 'lucide-react'

export default function CategoriaIcon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[name] ?? Package
  return <Cmp {...props} />
}
```

- [ ] **Step 2:** `IconPicker.tsx` (grid buscable, paginado a 120 resultados):

```tsx
import { useMemo, useState } from 'react'
import { icons, type LucideProps } from 'lucide-react'

const NOMBRES = Object.keys(icons)

export default function IconPicker({ value, onChange }: { value: string; onChange: (n: string) => void }) {
  const [q, setQ] = useState('')
  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase()
    const arr = s ? NOMBRES.filter(n => n.toLowerCase().includes(s)) : NOMBRES
    return arr.slice(0, 120)
  }, [q])

  return (
    <div className="space-y-2">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ícono…"
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1 bg-slate-950/40 rounded-lg">
        {filtrados.map(n => {
          const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[n]
          const sel = n === value
          return (
            <button key={n} type="button" title={n} onClick={() => onChange(n)}
              className={`grid place-items-center h-9 rounded-md cursor-pointer transition-colors
                ${sel ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
              <Cmp size={18} />
            </button>
          )
        })}
        {filtrados.length === 0 && <p className="col-span-8 text-slate-500 text-xs text-center py-4">Sin resultados</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3:** Typecheck. Commit `feat(desktop): IconPicker + CategoriaIcon (set completo lucide)`.

### Task 6: CategoriasScreen + ruta

**Files:** Create `CategoriasScreen.tsx`; Modify `Sidebar.tsx`, `App.tsx`.

- [ ] **Step 1:** `Sidebar.tsx`: `ScreenId` += `'categorias'`; import `Tags` de lucide; NAV_ITEM `{ id:'categorias', Icon: Tags, label:'Categorías' }` (después de Productos).

- [ ] **Step 2:** `App.tsx`: import `CategoriasScreen`; `{screen === 'categorias' && <CategoriasScreen />}`.

- [ ] **Step 3:** `CategoriasScreen.tsx` (lista + form con IconPicker; usa `normalizarSlug` para id nuevo, `getDataStore`, `ScreenHeader`, `CategoriaIcon`):

```tsx
import { useEffect, useState } from 'react'
import { Tags, Plus, Trash2, Save, X } from 'lucide-react'
import type { Categoria } from '@kioscapp/shared'
import { normalizarSlug } from '@kioscapp/shared'
import { getDataStore } from '../store/dataStore'
import ScreenHeader from '../components/ScreenHeader'
import CategoriaIcon from '../components/CategoriaIcon'
import IconPicker from '../components/IconPicker'

const LOCAL_ID = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'

export default function CategoriasScreen() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [edit, setEdit] = useState<Categoria | null>(null)

  async function cargar() {
    try { setCats(await getDataStore().getAllCategorias()) } finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  function nueva() {
    const ts = new Date().toISOString()
    setEdit({ id: '', nombre: '', icono: 'Package', color: null, orden: (cats.at(-1)?.orden ?? 0) + 1,
      activo: true, created_at: ts, updated_at: ts, local_id: LOCAL_ID, sync_status: 'pending', deleted_at: null })
  }

  async function guardar() {
    if (!edit || !edit.nombre.trim()) return
    const id = edit.id || normalizarSlug(edit.nombre)
    await getDataStore().upsertCategoria({ ...edit, id, updated_at: new Date().toISOString(), sync_status: 'pending' })
    setEdit(null); await cargar()
  }
  async function borrar(id: string) {
    await getDataStore().eliminarCategoria(id); setEdit(null); await cargar()
  }

  return (
    <div className="flex h-full bg-slate-950">
      <div className="flex flex-col flex-1 min-w-0 border-r border-slate-800">
        <ScreenHeader Icon={Tags} title="Categorías" subtitle={`${cats.length} categorías`}>
          <button onClick={nueva} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors">
            <Plus size={16} /> Nueva
          </button>
        </ScreenHeader>
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 content-start">
          {cargando && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/60 border border-slate-700 rounded-xl animate-pulse" />
          ))}
          {!cargando && cats.map(c => (
            <button key={c.id} onClick={() => setEdit({ ...c })}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-colors
                ${edit?.id === c.id ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'} ${c.activo ? '' : 'opacity-50'}`}>
              <span className="w-9 h-9 grid place-items-center rounded-lg bg-slate-700/60 text-slate-200 shrink-0">
                <CategoriaIcon name={c.icono} size={18} />
              </span>
              <span className="text-white text-sm font-medium truncate">{c.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {edit ? (
        <div className="w-80 shrink-0 flex flex-col bg-slate-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-white font-semibold text-sm">{edit.id ? 'Editar categoría' : 'Nueva categoría'}</h2>
            <button onClick={() => setEdit(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Nombre *</label>
              <input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-2 flex items-center gap-2">
                Ícono <span className="w-7 h-7 grid place-items-center rounded bg-slate-800 text-blue-300"><CategoriaIcon name={edit.icono} size={16} /></span>
              </label>
              <IconPicker value={edit.icono} onChange={n => setEdit({ ...edit, icono: n })} />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Orden</label>
              <input type="number" value={edit.orden} onChange={e => setEdit({ ...edit, orden: Number(e.target.value) })}
                className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
              <input type="checkbox" checked={edit.activo} onChange={e => setEdit({ ...edit, activo: e.target.checked })} /> Activa
            </label>
          </div>
          <div className="shrink-0 p-4 border-t border-slate-800 space-y-2">
            <button onClick={guardar} disabled={!edit.nombre.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg cursor-pointer transition-colors text-sm">
              <Save size={16} /> Guardar
            </button>
            {edit.id && (
              <button onClick={() => borrar(edit.id)}
                className="w-full flex items-center justify-center gap-2 border border-red-700 text-red-400 hover:bg-red-900/30 font-medium py-2 rounded-lg cursor-pointer transition-colors text-sm">
                <Trash2 size={15} /> Eliminar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-80 shrink-0 flex items-center justify-center text-slate-600 text-sm bg-slate-900">
          Seleccioná o creá una categoría
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4:** Typecheck. Commit `feat(desktop): pantalla Categorías con IconPicker`.

---

## Fase D — Desktop: consumir categorías dinámicas

### Task 7: ProductGrid + ProductosScreen + Promociones leen categorías de DB

**Files:** Modify `ProductGrid.tsx`, `ProductosScreen.tsx`, `PromocionesScreen.tsx`.

- [ ] **Step 1: ProductGrid** — cargar categorías de DB; reemplazar `CATEGORIA_ICONS`/`CATEGORIA_LABEL` por la lista cargada + `CategoriaIcon`. Estado `const [cats,setCats]=useState<Categoria[]>([])`; en el `useEffect`: `getDataStore().getCategorias().then(setCats)`. Chips: `cats.filter(c => categoriasConProductos.includes(c.id))`, ícono `<CategoriaIcon name={c.icono} />`, label `c.nombre`. Tarjeta de producto: `const cat = cats.find(c=>c.id===p.categoria)`, `<CategoriaIcon name={cat?.icono ?? 'Package'} />`.

- [ ] **Step 2: ProductosScreen** — el `<select>` de categoría usa categorías de DB:
estado `const [cats,setCats]=useState<Categoria[]>([])`, `useEffect` carga `getCategorias()`; `{cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}`. Quitar el `CATEGORIAS` hardcodeado. Mostrar label en la tabla con `cats.find(...)?.nombre ?? p.categoria`.

- [ ] **Step 3: PromocionesScreen** — el form objetivo=categoría usa `getCategorias()` para el `<select>` (id→nombre) en vez de `CATEGORIA_ORDEN`/`CATEGORIA_LABEL`.

- [ ] **Step 4:** Typecheck. Commit `feat(desktop): grid/productos/promos con categorías dinámicas`.

---

## Fase E — Ticket dinámico (TS + Rust)

### Task 8: DatosTicket.categorias + buildLineas dinámico

**Files:** Modify `lib/ticket.ts`, `components/PaymentModal.tsx`, `screens/VentasScreen.tsx`, `components/TicketModal.tsx`.

- [ ] **Step 1: ticket.ts** — `DatosTicket` += `categorias: { id: string; nombre: string; orden: number }[]`. En `buildLineas`, reemplazar el loop por `CATEGORIA_ORDEN` por:

```typescript
  const cats = [...d.categorias].sort((a, b) => a.orden - b.orden)
  const usados = new Set(d.items.map(i => i.categoria))
  const orden: { id: string; nombre: string }[] = [
    ...cats.filter(c => usados.has(c.id)),
    // categorías de ítems que ya no existen en el catálogo → al final, label = id
    ...[...usados].filter(id => !cats.some(c => c.id === id)).map(id => ({ id, nombre: id })),
  ]
  for (const cat of orden) {
    const items = d.items.filter(i => i.categoria === cat.id)
    if (items.length === 0) continue
    lines.push({ tipo: 'texto', texto: cat.nombre, negrita: true })
    // ... (resto del render de items igual que hoy)
  }
```
Quitar el `import { CATEGORIA_LABEL, CATEGORIA_ORDEN }`.

- [ ] **Step 2: PaymentModal** y **VentasScreen** — al armar `DatosTicket`, agregar
`categorias: (await getDataStore().getCategorias()).map(c => ({ id: c.id, nombre: c.nombre, orden: c.orden }))`.
En PaymentModal cargar las categorías en el `useEffect` (estado) y usarlas; en VentasScreen
cargarlas junto a impresora/nombre.

- [ ] **Step 3: TicketModal** — sin cambios de lógica (usa `buildLineas`); ya recibe `datos` con `categorias`.

- [ ] **Step 4:** Typecheck. Commit `feat(desktop): ticket agrupa por categorías dinámicas`.

### Task 9: Rust build_escpos agrupa por payload

**Files:** Modify `apps/desktop/src-tauri/src/print.rs`.

- [ ] **Step 1:** `DatosTicket` (Rust) += `#[serde(default)] pub categorias: Vec<CategoriaTicket>` con
```rust
#[derive(Deserialize)]
pub struct CategoriaTicket { pub id: String, pub nombre: String, #[serde(default)] pub orden: i64 }
```
Reemplazar el `CATEGORIA_ORDEN` fijo: ordenar `datos.categorias` por `orden`, iterar; para cada una filtrar items por `i.categoria == cat.id`; además, al final, agrupar ids de items que no estén en `categorias` (label = id). Título en negrita = `cat.nombre`.

- [ ] **Step 2:** `cargo check` en `src-tauri`. Commit `feat(desktop): ESC/POS agrupa por categorías del payload`.

---

## Fase F — Backend + sync

### Task 10: Schema + endpoints + dashboard

**Files:** Modify `schema.ts`, `catalog/route.ts`, `sync/ingest/route.ts`; Create `api/categorias/route.ts`, `api/categorias/[id]/route.ts`, `dashboard/categorias/page.tsx`, `dashboard/_components/IconPicker.tsx`.

- [ ] **Step 1: schema.ts** — tabla:
```typescript
export const categorias = pgTable('categorias', {
  ...syncFields,
  nombre: text('nombre').notNull(),
  icono:  text('icono').notNull().default('Package'),
  color:  text('color'),
  orden:  integer('orden').notNull().default(100),
  activo: boolean('activo').notNull().default(true),
}, t => [index('idx_categorias_local').on(t.local_id)])
```
`db:push`.

- [ ] **Step 2: catalog GET** — agregar `categorias` a la respuesta (select all, o `gte(updated_at, since)` como productos). **ingest** — aceptar `body.categorias` (upsert/`onConflictDoNothing` o update por id, igual patrón que productos).

- [ ] **Step 3: /api/categorias** (GET/POST) y **/api/categorias/[id]** (PATCH/DELETE) autenticados por sesión, espejo de `/api/descuentos`. POST usa `normalizarSlug(nombre)` para id; campos nombre/icono/color/orden/activo; `local_id:'central'`.

- [ ] **Step 4: dashboard/categorias/page.tsx** — CRUD client con IconPicker (copia del de desktop, lucide-react en Next). dashboard `descuentos/page.tsx` y el form de categoría leen `GET /api/categorias`.

- [ ] **Step 5:** Typecheck backend. Commit `feat(backend): categorias schema + API + dashboard`.

### Task 11: Sync desktop (pull + push)

**Files:** Modify `apps/desktop/src/lib/syncEngine.ts`, `SqliteDataStore.getPendientesSincronizacion`.

- [ ] **Step 1: pullCatalogo** — la respuesta de `/api/catalog` ahora trae `categorias`; upsert local: `for (const c of data.categorias) await store.upsertCategoria({ ...c, sync_status:'synced' })`.

- [ ] **Step 2: pushPendientes** — agregar `'categorias'` a la lista de tablas en
`getPendientesSincronizacion` (`SqliteDataStore`) y enviar `payload.categorias` en el POST a
`/api/sync/ingest` (mismo bloque que `venta_items`).

- [ ] **Step 3:** Typecheck. Commit `feat(desktop): sync de categorías (pull+push)`.

---

## Verificación final
- `pnpm --filter @kioscapp/shared test` (slug) verde.
- `pnpm typecheck` (turbo) + `cargo check` verde.
- Arranque limpio: 7 categorías sembradas; productos viejos agrupan igual.
- Crear categoría con ícono en desktop → aparece en grid y en select de productos; asignarla a un producto; vender → ticket agrupa con su nombre/orden; reimpresión conserva.
- IconPicker: buscar filtra el set lucide; elegir guarda el nombre.
- Sync: crear en web → pull la baja al desktop; crear en desktop → push la sube a la web.

## Notas
- id = slug → cero migración (defaults = enum viejo).
- Nunca montar los ~1500 íconos a la vez: filtrar + `slice(0,120)`.
- Borrar = soft-delete; ventas viejas con esa categoría siguen mostrando el id como label si se borró.
- Backend Next breaking changes: leer `node_modules/next/dist/docs/`; Context7 para libs.
