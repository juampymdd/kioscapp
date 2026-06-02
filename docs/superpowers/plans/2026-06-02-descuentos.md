# Sistema de descuentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Descuentos manuales (por ítem + global de venta) y de catálogo (global y por sucursal), resueltos por una función pura offline, congelados en centavos en `venta_items`, administrados desde el dashboard.

**Architecture:** Función pura `resolverDescuentoItem` en `@kioscapp/shared` (única fuente de verdad, sin DB/red). Catálogo de descuentos vive en backend (Drizzle), se administra en el dashboard, y baja al desktop por un pull autenticado que cachea en SQLite local. El carrito resuelve el descuento efectivo por ítem (prioridad manual > sucursal > global; producto > categoría, sin acumular) y lo congela al vender. El ticket (Fase 1) ya imprime `-$x` por ítem y `DESCUENTO:` global.

**Tech Stack:** pnpm workspaces + turbo · TypeScript · React · Zustand · Tauri + tauri-plugin-sql (SQLite) · Rust (ESC/POS) · Next.js (breaking-changes fork: leer `node_modules/next/dist/docs/`) · Drizzle + Postgres · vitest (nuevo, solo en shared).

---

## Estructura de archivos

**Crear:**
- `packages/shared/src/types/descuento.ts` — tipos `Descuento`, `ObjetivoDescuento`, `TipoDescuento`.
- `packages/shared/src/descuentos.ts` — resolver puro `resolverDescuentoItem` + `calcularDescuento`.
- `packages/shared/src/descuentos.test.ts` — tests del resolver.
- `packages/shared/vitest.config.ts` — config de tests.
- `apps/backend/app/api/descuentos/route.ts` — CRUD dashboard (GET/POST).
- `apps/backend/app/api/descuentos/[id]/route.ts` — CRUD dashboard (PATCH/DELETE).
- `apps/backend/app/api/puntos-venta/[id]/descuentos/route.ts` — pull autenticado.
- `apps/backend/app/dashboard/descuentos/page.tsx` — UI CRUD.

**Modificar:**
- `packages/shared/src/index.ts` — reexport de descuentos.
- `packages/shared/package.json` — dep vitest + script `test`.
- `apps/backend/src/db/schema.ts` — tabla `descuentos`.
- `apps/desktop/src/lib/migrations.ts` — tabla local `descuentos`.
- `apps/desktop/src/store/dataStore.ts` — interfaz (`upsertDescuento`, `getDescuentosActivos`).
- `apps/desktop/src/store/SqliteDataStore.ts` — impl de los métodos + `mapDescuento`.
- `apps/desktop/src/services/syncService.ts` — `pullDescuentos`.
- `apps/desktop/src/store/cartStore.ts` — descuento manual por ítem + resolución efectiva.
- `apps/desktop/src/components/Cart.tsx` — botón/popover de descuento por ítem.
- `apps/desktop/src/components/PaymentModal.tsx` — campo de descuento global + congelar al vender.

---

## Fase A — Shared: tipos + resolver (TDD)

### Task 1: Tipos de descuento

**Files:**
- Create: `packages/shared/src/types/descuento.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Crear el archivo de tipos**

```typescript
// packages/shared/src/types/descuento.ts
import type { CategoriaProducto } from './producto'

export type ObjetivoDescuento = 'producto' | 'categoria'
export type TipoDescuento = 'monto' | 'porcentaje'

/**
 * Descuento de catálogo. sucursal_id NULL = global (aplica a todas las sucursales
 * del dueño). valor: si tipo='monto' son centavos; si tipo='porcentaje' es entero 1..100.
 */
export interface Descuento {
  id: string
  user_id: string
  sucursal_id: string | null
  objetivo: ObjetivoDescuento
  producto_id: string | null
  categoria: CategoriaProducto | null
  tipo: TipoDescuento
  valor: number
  activo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}
```

- [ ] **Step 2: Reexportar desde el index**

Modificar `packages/shared/src/index.ts`, agregar al final:

```typescript
export * from './types/descuento'
export * from './descuentos'
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/descuento.ts packages/shared/src/index.ts
git commit -m "feat(shared): tipo Descuento"
```

---

### Task 2: Setup de vitest en shared

**Files:**
- Modify: `packages/shared/package.json`
- Create: `packages/shared/vitest.config.ts`

- [ ] **Step 1: Agregar vitest como devDependency y script**

En `packages/shared/package.json`, dentro de `"scripts"` agregar `"test": "vitest run"` y en `"devDependencies"` agregar `"vitest": "^3"`. Queda:

```json
{
  "name": "@kioscapp/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

- [ ] **Step 2: Crear config de vitest**

```typescript
// packages/shared/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Instalar**

Run: `pnpm install` (desde la raíz del repo)
Expected: instala vitest en `packages/shared`.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/package.json packages/shared/vitest.config.ts
git commit -m "chore(shared): setup vitest"
```

---

### Task 3: Resolver de descuentos (TDD)

**Files:**
- Create: `packages/shared/src/descuentos.test.ts`
- Create: `packages/shared/src/descuentos.ts`

- [ ] **Step 1: Escribir los tests primero**

```typescript
// packages/shared/src/descuentos.test.ts
import { describe, it, expect } from 'vitest'
import { resolverDescuentoItem, type DescuentoItemInput } from './descuentos'
import type { Descuento } from './types/descuento'

const item: DescuentoItemInput = {
  producto_id: 'p1',
  categoria: 'bebidas',
  subtotal_centavos: 1000,
}

function desc(p: Partial<Descuento>): Descuento {
  return {
    id: 'd', user_id: 'u', sucursal_id: null, objetivo: 'categoria',
    producto_id: null, categoria: 'bebidas', tipo: 'monto', valor: 100,
    activo: true, created_at: '', updated_at: '', deleted_at: null, ...p,
  }
}

describe('resolverDescuentoItem', () => {
  it('sin manual ni catálogo → 0', () => {
    expect(resolverDescuentoItem(item, null, [])).toBe(0)
  })

  it('manual gana siempre', () => {
    const cat = [desc({ tipo: 'monto', valor: 500, objetivo: 'producto', producto_id: 'p1' })]
    expect(resolverDescuentoItem(item, 200, cat)).toBe(200)
  })

  it('monto se aplica tal cual', () => {
    expect(resolverDescuentoItem(item, null, [desc({ tipo: 'monto', valor: 150 })])).toBe(150)
  })

  it('porcentaje = floor(subtotal * valor / 100)', () => {
    expect(resolverDescuentoItem(item, null, [desc({ tipo: 'porcentaje', valor: 10 })])).toBe(100)
  })

  it('clampa el descuento al subtotal', () => {
    expect(resolverDescuentoItem(item, 5000, [])).toBe(1000)
    expect(resolverDescuentoItem(item, null, [desc({ tipo: 'monto', valor: 5000 })])).toBe(1000)
  })

  it('sucursal gana sobre global', () => {
    const cat = [
      desc({ id: 'g', sucursal_id: null, tipo: 'monto', valor: 100 }),
      desc({ id: 's', sucursal_id: 'suc1', tipo: 'monto', valor: 300 }),
    ]
    expect(resolverDescuentoItem(item, null, cat)).toBe(300)
  })

  it('producto gana sobre categoría dentro del mismo scope', () => {
    const cat = [
      desc({ id: 'c', objetivo: 'categoria', categoria: 'bebidas', tipo: 'monto', valor: 100 }),
      desc({ id: 'p', objetivo: 'producto', producto_id: 'p1', categoria: null, tipo: 'monto', valor: 250 }),
    ]
    expect(resolverDescuentoItem(item, null, cat)).toBe(250)
  })

  it('ignora descuentos que no matchean ni los inactivos', () => {
    const cat = [
      desc({ objetivo: 'producto', producto_id: 'otro', categoria: null, valor: 999 }),
      desc({ categoria: 'golosinas', valor: 999 }),
      desc({ categoria: 'bebidas', valor: 100, activo: false }),
    ]
    expect(resolverDescuentoItem(item, null, cat)).toBe(0)
  })
})
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `pnpm --filter @kioscapp/shared test`
Expected: FAIL — `resolverDescuentoItem` no existe.

- [ ] **Step 3: Implementar el resolver**

```typescript
// packages/shared/src/descuentos.ts
import type { CategoriaProducto } from './types/producto'
import type { Descuento } from './types/descuento'

export interface DescuentoItemInput {
  producto_id: string
  categoria: CategoriaProducto
  subtotal_centavos: number
}

/** Centavos a descontar para un descuento dado, clampeado al subtotal. */
export function calcularDescuento(d: Descuento, subtotal_centavos: number): number {
  const raw = d.tipo === 'porcentaje'
    ? Math.floor((subtotal_centavos * d.valor) / 100)
    : d.valor
  return Math.max(0, Math.min(raw, subtotal_centavos))
}

function matchea(d: Descuento, item: DescuentoItemInput): boolean {
  if (d.objetivo === 'producto') return d.producto_id === item.producto_id
  return d.categoria === item.categoria
}

/** Rank de prioridad: sucursal(2) sobre global(1); producto(2) sobre categoría(1). */
function rank(d: Descuento): number {
  const scope    = d.sucursal_id !== null ? 2 : 1
  const objetivo = d.objetivo === 'producto' ? 2 : 1
  return scope * 10 + objetivo
}

/**
 * Descuento efectivo en centavos para un ítem. Gana uno solo (no acumula):
 * manual > sucursal > global; dentro de cada scope, producto > categoría.
 * El catálogo ya viene scopeado (global del dueño + esta sucursal).
 */
export function resolverDescuentoItem(
  item: DescuentoItemInput,
  manual_centavos: number | null,
  catalogo: Descuento[],
): number {
  if (manual_centavos !== null) {
    return Math.max(0, Math.min(manual_centavos, item.subtotal_centavos))
  }

  const candidatos = catalogo
    .filter(d => d.activo && d.deleted_at === null && matchea(d, item))
    .sort((a, b) => rank(b) - rank(a))

  if (candidatos.length === 0) return 0
  return calcularDescuento(candidatos[0], item.subtotal_centavos)
}
```

- [ ] **Step 4: Correr los tests y ver que pasan**

Run: `pnpm --filter @kioscapp/shared test`
Expected: PASS (8 tests).

- [ ] **Step 5: Typecheck shared**

Run: `pnpm --filter @kioscapp/shared typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/descuentos.ts packages/shared/src/descuentos.test.ts
git commit -m "feat(shared): resolver de descuentos con tests"
```

---

## Fase B — Backend: schema + endpoints + dashboard

### Task 4: Tabla `descuentos` en el schema

**Files:**
- Modify: `apps/backend/src/db/schema.ts`

- [ ] **Step 1: Agregar la tabla al final del schema (antes de cerrar el archivo)**

```typescript
// apps/backend/src/db/schema.ts — agregar al final
export const descuentos = pgTable('descuentos', {
  ...syncFields,
  user_id:     text('user_id').notNull().references(() => users.id),
  sucursal_id: text('sucursal_id').references(() => sucursales.id),
  objetivo:    text('objetivo', { enum: ['producto', 'categoria'] }).notNull(),
  producto_id: text('producto_id'),
  categoria:   text('categoria'),
  tipo:        text('tipo', { enum: ['monto', 'porcentaje'] }).notNull(),
  valor:       integer('valor').notNull(),
  activo:      boolean('activo').notNull().default(true),
}, t => [
  index('idx_descuentos_user').on(t.user_id),
  index('idx_descuentos_sucursal').on(t.sucursal_id),
])
```

Nota: `syncFields` ya aporta `id`, `local_id`, `sync_status`, `created_at`, `updated_at`, `deleted_at`. `local_id` no se usa para descuentos pero se completa con el `user_id` o `'central'` al insertar (ver Task 5).

- [ ] **Step 2: Aplicar el schema a la DB**

Run: `pnpm --filter backend db:push`
Expected: crea la tabla `descuentos`. (Requiere `DATABASE_URL` en el entorno.)

- [ ] **Step 3: Typecheck backend**

Run: `pnpm --filter backend typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/db/schema.ts
git commit -m "feat(backend): tabla descuentos"
```

---

### Task 5: API CRUD del dashboard (`/api/descuentos`)

**Files:**
- Create: `apps/backend/app/api/descuentos/route.ts`
- Create: `apps/backend/app/api/descuentos/[id]/route.ts`

- [ ] **Step 1: GET (listar) + POST (crear)**

```typescript
// apps/backend/app/api/descuentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { descuentos } from '@/src/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = getDb()
  const rows = await db.select().from(descuentos)
    .where(and(eq(descuentos.user_id, session.userId), isNull(descuentos.deleted_at)))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: {
    sucursal_id?: string | null
    objetivo?: 'producto' | 'categoria'
    producto_id?: string | null
    categoria?: string | null
    tipo?: 'monto' | 'porcentaje'
    valor?: number
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (body.objetivo !== 'producto' && body.objetivo !== 'categoria')
    return NextResponse.json({ error: 'objetivo inválido' }, { status: 400 })
  if (body.tipo !== 'monto' && body.tipo !== 'porcentaje')
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  if (typeof body.valor !== 'number' || body.valor <= 0)
    return NextResponse.json({ error: 'valor debe ser > 0' }, { status: 400 })
  if (body.objetivo === 'producto' && !body.producto_id)
    return NextResponse.json({ error: 'producto_id requerido' }, { status: 400 })
  if (body.objetivo === 'categoria' && !body.categoria)
    return NextResponse.json({ error: 'categoria requerida' }, { status: 400 })

  const db = getDb()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.insert(descuentos).values({
    id,
    local_id:    'central',
    user_id:     session.userId,
    sucursal_id: body.sucursal_id ?? null,
    objetivo:    body.objetivo,
    producto_id: body.objetivo === 'producto' ? body.producto_id! : null,
    categoria:   body.objetivo === 'categoria' ? body.categoria! : null,
    tipo:        body.tipo,
    valor:       body.valor,
    activo:      true,
    sync_status: 'synced',
    created_at:  now,
    updated_at:  now,
  })

  const row = await db.select().from(descuentos).where(eq(descuentos.id, id))
  return NextResponse.json(row[0], { status: 201 })
}
```

- [ ] **Step 2: PATCH (editar/activar) + DELETE (soft-delete)**

```typescript
// apps/backend/app/api/descuentos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { descuentos } from '@/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/src/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  let body: { valor?: number; activo?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.valor === 'number' && body.valor > 0) patch.valor = body.valor
  if (typeof body.activo === 'boolean') patch.activo = body.activo

  const db = getDb()
  await db.update(descuentos).set(patch)
    .where(and(eq(descuentos.id, id), eq(descuentos.user_id, session.userId)))
  const row = await db.select().from(descuentos).where(eq(descuentos.id, id))
  return NextResponse.json(row[0] ?? null)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  await db.update(descuentos)
    .set({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .where(and(eq(descuentos.id, id), eq(descuentos.user_id, session.userId)))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter backend typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/app/api/descuentos
git commit -m "feat(backend): CRUD de descuentos"
```

---

### Task 6: Endpoint de pull autenticado (`/api/puntos-venta/[id]/descuentos`)

**Files:**
- Create: `apps/backend/app/api/puntos-venta/[id]/descuentos/route.ts`

- [ ] **Step 1: GET scopeado por sucursal + secret**

```typescript
// apps/backend/app/api/puntos-venta/[id]/descuentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { puntos_venta, sucursales, descuentos } from '@/src/db/schema'
import { and, eq, isNull, or } from 'drizzle-orm'

async function resolverPV(pvId: string, secret: string) {
  const db = getDb()
  const rows = await db
    .select({ sync_secret: puntos_venta.sync_secret, user_id: sucursales.user_id, sucursal_id: sucursales.id })
    .from(puntos_venta)
    .innerJoin(sucursales, eq(puntos_venta.sucursal_id, sucursales.id))
    .where(and(eq(puntos_venta.id, pvId), eq(puntos_venta.activo, true)))
  if (rows.length === 0 || rows[0].sync_secret !== secret) return null
  return { userId: rows[0].user_id, sucursalId: rows[0].sucursal_id }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const secret = req.headers.get('x-sync-secret') ?? ''
  const pv = secret ? await resolverPV(id, secret) : null
  if (!pv) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = getDb()
  const rows = await db.select().from(descuentos).where(
    and(
      eq(descuentos.user_id, pv.userId),
      eq(descuentos.activo, true),
      isNull(descuentos.deleted_at),
      or(isNull(descuentos.sucursal_id), eq(descuentos.sucursal_id, pv.sucursalId)),
    ),
  )
  return NextResponse.json({ descuentos: rows })
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter backend typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/api/puntos-venta/\[id\]/descuentos
git commit -m "feat(backend): pull de descuentos por punto de venta"
```

---

### Task 7: UI del dashboard para administrar descuentos

**Files:**
- Create: `apps/backend/app/dashboard/descuentos/page.tsx`

> Antes de escribir: leer `node_modules/next/dist/docs/` por breaking changes (ver AGENTS.md). Revisar un page existente del dashboard (`app/dashboard/sucursales/[id]/page.tsx`) para seguir el patrón de fetch/estilos. Estilos según DESIGN.md (oscuro plano, azul accionable, sentence case).

- [ ] **Step 1: Crear la página (client component) con listado + alta + toggle/baja**

```tsx
// apps/backend/app/dashboard/descuentos/page.tsx
'use client'
import { useEffect, useState } from 'react'

type Descuento = {
  id: string; sucursal_id: string | null; objetivo: 'producto' | 'categoria'
  producto_id: string | null; categoria: string | null
  tipo: 'monto' | 'porcentaje'; valor: number; activo: boolean
}
type Sucursal = { id: string; nombre: string }
type Producto = { id: string; descripcion: string }

const CATEGORIAS = ['cigarrillos','bebidas','golosinas','kiosco','recarga_sube','recarga_celular','varios']

export default function DescuentosPage() {
  const [items, setItems] = useState<Descuento[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState({
    sucursal_id: '', objetivo: 'categoria', producto_id: '', categoria: 'bebidas',
    tipo: 'porcentaje', valor: 10,
  })

  async function cargar() {
    const r = await fetch('/api/descuentos'); setItems(await r.json())
  }
  useEffect(() => {
    cargar()
    fetch('/api/sucursales').then(r => r.json()).then(setSucursales)
    fetch('/api/catalog').then(r => r.json()).then(d => setProductos(d.productos ?? []))
  }, [])

  async function crear() {
    const body = {
      sucursal_id: form.sucursal_id || null,
      objetivo: form.objetivo,
      producto_id: form.objetivo === 'producto' ? form.producto_id : null,
      categoria:   form.objetivo === 'categoria' ? form.categoria : null,
      tipo: form.tipo,
      valor: form.tipo === 'porcentaje' ? Number(form.valor) : Math.round(Number(form.valor) * 100),
    }
    await fetch('/api/descuentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await cargar()
  }
  async function toggle(d: Descuento) {
    await fetch(`/api/descuentos/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !d.activo }) })
    await cargar()
  }
  async function borrar(d: Descuento) {
    await fetch(`/api/descuentos/${d.id}`, { method: 'DELETE' })
    await cargar()
  }

  const valorTxt = (d: Descuento) => d.tipo === 'porcentaje' ? `${d.valor}%` : `$${(d.valor/100).toFixed(2)}`
  const ambitoTxt = (d: Descuento) => d.sucursal_id ? (sucursales.find(s => s.id === d.sucursal_id)?.nombre ?? 'Sucursal') : 'Global'
  const objetivoTxt = (d: Descuento) => d.objetivo === 'producto'
    ? (productos.find(p => p.id === d.producto_id)?.descripcion ?? 'Producto')
    : `Categoría: ${d.categoria}`

  return (
    <div className="p-6 text-slate-50">
      <h1 className="text-lg font-bold mb-4">Descuentos</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 max-w-2xl">
        <label className="text-xs text-slate-400">Ámbito
          <select value={form.sucursal_id} onChange={e => setForm({ ...form, sucursal_id: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
            <option value="">Global (todas)</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">Objetivo
          <select value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
            <option value="categoria">Categoría</option>
            <option value="producto">Producto</option>
          </select>
        </label>
        {form.objetivo === 'categoria' ? (
          <label className="text-xs text-slate-400">Categoría
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        ) : (
          <label className="text-xs text-slate-400">Producto
            <select value={form.producto_id} onChange={e => setForm({ ...form, producto_id: e.target.value })}
              className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
              <option value="">Elegí…</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs text-slate-400">Tipo
          <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50">
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="monto">Monto ($)</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">Valor {form.tipo === 'porcentaje' ? '(%)' : '($)'}
          <input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: Number(e.target.value) })}
            className="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-50" />
        </label>
        <button onClick={crear} className="col-span-2 bg-blue-600 hover:bg-blue-500 rounded-xl py-2 font-medium">
          Agregar descuento
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-slate-400 text-left border-b border-slate-700">
          <th className="py-2">Ámbito</th><th>Objetivo</th><th>Valor</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody>
          {items.map(d => (
            <tr key={d.id} className="border-b border-slate-800">
              <td className="py-2">{ambitoTxt(d)}</td>
              <td>{objetivoTxt(d)}</td>
              <td className="tabular-nums">{valorTxt(d)}</td>
              <td>
                <button onClick={() => toggle(d)} className={d.activo ? 'text-green-400' : 'text-slate-500'}>
                  {d.activo ? 'Activo' : 'Inactivo'}
                </button>
              </td>
              <td className="text-right">
                <button onClick={() => borrar(d)} className="text-red-400 hover:text-red-300">Eliminar</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Sin descuentos cargados</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verificar visual + alta**

Run: `pnpm --filter backend dev` y abrir `/dashboard/descuentos`.
Expected: listar/crear/activar/eliminar funciona; el alta recarga la tabla.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/dashboard/descuentos/page.tsx
git commit -m "feat(backend): dashboard de descuentos"
```

---

## Fase C — Desktop: persistencia local + pull

### Task 8: Tabla local + métodos del store

**Files:**
- Modify: `apps/desktop/src/lib/migrations.ts`
- Modify: `apps/desktop/src/store/dataStore.ts`
- Modify: `apps/desktop/src/store/SqliteDataStore.ts`

- [ ] **Step 1: Agregar migración de la tabla local (al final del array `migrations`)**

```typescript
// apps/desktop/src/lib/migrations.ts — nuevo objeto al final del array
  {
    description: 'Tabla descuentos local — Fase 3',
    sql: `
      CREATE TABLE IF NOT EXISTS descuentos (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL DEFAULT '',
        sucursal_id  TEXT,
        objetivo     TEXT NOT NULL,
        producto_id  TEXT,
        categoria    TEXT,
        tipo         TEXT NOT NULL,
        valor        INTEGER NOT NULL,
        activo       INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL DEFAULT '',
        updated_at   TEXT NOT NULL DEFAULT '',
        deleted_at   TEXT
      );
    `,
  },
```

- [ ] **Step 2: Agregar métodos a la interfaz `DataStore`**

En `apps/desktop/src/store/dataStore.ts`, importar el tipo y agregar métodos en la sección de Sincronización:

```typescript
// arriba, junto a los otros imports de tipo:
import type { Descuento } from '@kioscapp/shared'

// dentro de interface DataStore, antes de "// ── Sincronización":
  // ── Descuentos (catálogo bajado del central) ───────────────────────────────
  upsertDescuento(d: Descuento): Promise<void>
  getDescuentosActivos(): Promise<Descuento[]>
```

- [ ] **Step 3: Implementar en `SqliteDataStore` (agregar mapper + métodos)**

En `apps/desktop/src/store/SqliteDataStore.ts`, agregar al import de tipos `Descuento`, un mapper, y los dos métodos (junto a los de productos):

```typescript
function mapDescuento(r: Row): Descuento {
  return {
    id: r.id as string,
    user_id: (r.user_id as string) ?? '',
    sucursal_id: (r.sucursal_id as string | null) ?? null,
    objetivo: r.objetivo as Descuento['objetivo'],
    producto_id: (r.producto_id as string | null) ?? null,
    categoria: (r.categoria as Descuento['categoria']) ?? null,
    tipo: r.tipo as Descuento['tipo'],
    valor: r.valor as number,
    activo: (r.activo as number) === 1,
    created_at: (r.created_at as string) ?? '',
    updated_at: (r.updated_at as string) ?? '',
    deleted_at: (r.deleted_at as string | null) ?? null,
  }
}
```

```typescript
  async upsertDescuento(d: Descuento): Promise<void> {
    await this.db.execute(
      `INSERT INTO descuentos
         (id, user_id, sucursal_id, objetivo, producto_id, categoria, tipo, valor,
          activo, created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT(id) DO UPDATE SET
         sucursal_id=excluded.sucursal_id, objetivo=excluded.objetivo,
         producto_id=excluded.producto_id, categoria=excluded.categoria,
         tipo=excluded.tipo, valor=excluded.valor, activo=excluded.activo,
         updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`,
      [
        d.id, d.user_id, d.sucursal_id, d.objetivo, d.producto_id, d.categoria,
        d.tipo, d.valor, d.activo ? 1 : 0, d.created_at, d.updated_at, d.deleted_at,
      ],
    )
  }

  async getDescuentosActivos(): Promise<Descuento[]> {
    const rows = await this.db.select<Row[]>(
      `SELECT * FROM descuentos WHERE activo = 1 AND deleted_at IS NULL`,
    )
    return rows.map(mapDescuento)
  }
```

- [ ] **Step 4: Typecheck desktop**

Run: `pnpm --filter desktop exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/lib/migrations.ts apps/desktop/src/store/dataStore.ts apps/desktop/src/store/SqliteDataStore.ts
git commit -m "feat(desktop): persistencia local de descuentos"
```

---

### Task 9: Pull de descuentos en el sync

**Files:**
- Modify: `apps/desktop/src/services/syncService.ts`

- [ ] **Step 1: Agregar `pullDescuentos` a la clase `SyncService`**

Agregar el método dentro de la clase (al lado de `pullVentas`):

```typescript
  async pullDescuentos(store: SqliteDataStore): Promise<number> {
    if (!this.backendUrl || !this.syncSecret || this.localId === 'local-demo') return 0

    const res = await fetch(`${this.backendUrl}/api/puntos-venta/${this.localId}/descuentos`, {
      headers: { 'x-sync-secret': this.syncSecret },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json() as { descuentos: import('@kioscapp/shared').Descuento[] }
    for (const d of data.descuentos) {
      await store.upsertDescuento(d)
    }
    return data.descuentos.length
  }
```

- [ ] **Step 2: Llamarlo dentro del ciclo `sync()` (después de marcar sincronizado, antes del `setState` final de OK)**

En `sync()`, justo antes de `this.setState({ status: 'ok', ... })` del camino feliz, agregar (tolerante a error para no romper el push):

```typescript
      try {
        await this.pullDescuentos(store)
      } catch (e) {
        console.warn('[sync] pull descuentos falló:', e)
      }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter desktop exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/services/syncService.ts
git commit -m "feat(desktop): pull de descuentos en el sync"
```

---

## Fase D — Desktop: carrito, cobro y congelado

### Task 10: Descuento manual + resolución efectiva en el carrito

**Files:**
- Modify: `apps/desktop/src/store/cartStore.ts`

- [ ] **Step 1: Extender `CartItem` y el store con descuento manual + catálogo + resolución**

Reescribir `apps/desktop/src/store/cartStore.ts`:

```typescript
import { create } from 'zustand'
import type { Producto, Descuento } from '@kioscapp/shared'
import { resolverDescuentoItem } from '@kioscapp/shared'

export interface CartItem {
  producto: Producto
  cantidad: number
  subtotal_centavos: number
  /** Descuento manual fijado por el cajero (centavos). null = sin override manual. */
  descuentoManual_centavos: number | null
  /** Descuento efectivo resuelto (manual o catálogo), congelable al vender. */
  descuento_centavos: number
}

interface CartStore {
  items: CartItem[]
  descuento_centavos: number          // descuento global manual de la venta
  catalogo: Descuento[]               // catálogo bajado del central
  addItem: (producto: Producto, cantidad?: number) => void
  removeItem: (productoId: string) => void
  updateCantidad: (productoId: string, cantidad: number) => void
  setDescuentoManualItem: (productoId: string, centavos: number | null) => void
  setDescuento: (centavos: number) => void
  setCatalogo: (catalogo: Descuento[]) => void
  clear: () => void
  subtotal: () => number
  descuentoItems: () => number
  total: () => number
}

/** Recalcula subtotal y descuento efectivo de un ítem. */
function recalcItem(item: CartItem, catalogo: Descuento[]): CartItem {
  const subtotal_centavos = Math.floor(item.cantidad * item.producto.precio_centavos)
  const descuento_centavos = resolverDescuentoItem(
    { producto_id: item.producto.id, categoria: item.producto.categoria, subtotal_centavos },
    item.descuentoManual_centavos,
    catalogo,
  )
  return { ...item, subtotal_centavos, descuento_centavos }
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  descuento_centavos: 0,
  catalogo: [],

  addItem(producto, cantidad = 1) {
    set(state => {
      const existing = state.items.find(i => i.producto.id === producto.id)
      const items = existing
        ? state.items.map(i => i.producto.id === producto.id
            ? recalcItem({ ...i, cantidad: i.cantidad + cantidad }, state.catalogo)
            : i)
        : [...state.items, recalcItem(
            { producto, cantidad, subtotal_centavos: 0, descuentoManual_centavos: null, descuento_centavos: 0 },
            state.catalogo,
          )]
      return { items }
    })
  },

  removeItem(productoId) {
    set(state => ({ items: state.items.filter(i => i.producto.id !== productoId) }))
  },

  updateCantidad(productoId, cantidad) {
    if (cantidad <= 0) { get().removeItem(productoId); return }
    set(state => ({
      items: state.items.map(i =>
        i.producto.id === productoId ? recalcItem({ ...i, cantidad }, state.catalogo) : i),
    }))
  },

  setDescuentoManualItem(productoId, centavos) {
    set(state => ({
      items: state.items.map(i =>
        i.producto.id === productoId
          ? recalcItem({ ...i, descuentoManual_centavos: centavos }, state.catalogo)
          : i),
    }))
  },

  setDescuento(centavos) { set({ descuento_centavos: Math.max(0, centavos) }) },

  setCatalogo(catalogo) {
    set(state => ({ catalogo, items: state.items.map(i => recalcItem(i, catalogo)) }))
  },

  clear() { set({ items: [], descuento_centavos: 0 }) },

  subtotal() { return get().items.reduce((acc, i) => acc + i.subtotal_centavos, 0) },
  descuentoItems() { return get().items.reduce((acc, i) => acc + i.descuento_centavos, 0) },
  total() {
    return Math.max(0, get().subtotal() - get().descuentoItems() - get().descuento_centavos)
  },
}))
```

- [ ] **Step 2: Cargar el catálogo al iniciar el POS**

En `apps/desktop/src/screens/POSScreen.tsx`, donde se cargan datos iniciales (junto al fetch de productos), agregar:

```typescript
import { useCartStore } from '../store/cartStore'
import { getDataStore } from '../store/dataStore'
// dentro de un useEffect de carga inicial:
getDataStore().getDescuentosActivos().then(useCartStore.getState().setCatalogo)
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter desktop exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/store/cartStore.ts apps/desktop/src/screens/POSScreen.tsx
git commit -m "feat(desktop): descuento por ítem y resolución en el carrito"
```

---

### Task 11: UI de descuento por ítem en el carrito

**Files:**
- Modify: `apps/desktop/src/components/Cart.tsx`

- [ ] **Step 1: Agregar botón `%/$` por línea + línea de descuento aplicado + fila de descuento de ítems en el total**

Reescribir `CartRow` y el bloque de totales de `apps/desktop/src/components/Cart.tsx`:

```tsx
import { ShoppingCart, X, Percent } from 'lucide-react'
import { useState } from 'react'
import { useCartStore, type CartItem } from '../store/cartStore'
import { formatCentavos } from '../lib/money'

function CartRow({ item }: { item: CartItem }) {
  const { updateCantidad, removeItem, setDescuentoManualItem } = useCartStore()
  const [editando, setEditando] = useState(false)
  const [modo, setModo] = useState<'monto' | 'porcentaje'>('porcentaje')
  const [valor, setValor] = useState('')

  function aplicar() {
    const n = Number(valor)
    if (!Number.isFinite(n) || n <= 0) { setDescuentoManualItem(item.producto.id, null); setEditando(false); return }
    const centavos = modo === 'porcentaje'
      ? Math.floor((item.subtotal_centavos * n) / 100)
      : Math.round(n * 100)
    setDescuentoManualItem(item.producto.id, centavos)
    setEditando(false); setValor('')
  }

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-slate-700/50">
      <div className="flex items-start gap-2">
        <p className="flex-1 min-w-0 text-white text-sm font-medium leading-snug line-clamp-2">
          {item.producto.descripcion}
        </p>
        <button
          onClick={() => setEditando(e => !e)}
          aria-label={`Descuento para ${item.producto.descripcion}`}
          className="w-7 h-7 -mt-0.5 grid place-items-center rounded-lg text-slate-400 shrink-0
                     hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <Percent size={14} />
        </button>
        <button
          onClick={() => removeItem(item.producto.id)}
          aria-label={`Quitar ${item.producto.descripcion} del carrito`}
          className="w-7 h-7 -mt-0.5 grid place-items-center rounded-lg text-slate-400 shrink-0
                     hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs tabular-nums">
          {formatCentavos(item.producto.precio_centavos)} c/u
        </span>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            onClick={() => updateCantidad(item.producto.id, item.cantidad - (item.producto.fraccionable ? 0.1 : 1))}
            aria-label={`Quitar uno de ${item.producto.descripcion}`}
            className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">−</button>
          <span className="w-9 text-center text-white font-mono text-sm tabular-nums">
            {item.producto.fraccionable ? item.cantidad.toFixed(2) : item.cantidad}
          </span>
          <button
            onClick={() => updateCantidad(item.producto.id, item.cantidad + (item.producto.fraccionable ? 0.1 : 1))}
            aria-label={`Agregar uno de ${item.producto.descripcion}`}
            className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">+</button>
        </div>
        <span className="w-20 text-right text-white font-semibold text-sm tabular-nums shrink-0">
          {formatCentavos(item.subtotal_centavos)}
        </span>
      </div>

      {item.descuento_centavos > 0 && (
        <div className="flex justify-end text-amber-400 text-xs tabular-nums">
          Descuento − {formatCentavos(item.descuento_centavos)}
        </div>
      )}

      {editando && (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex rounded-lg overflow-hidden border border-slate-600">
            <button onClick={() => setModo('porcentaje')}
              className={`px-2 py-1 text-xs ${modo === 'porcentaje' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>%</button>
            <button onClick={() => setModo('monto')}
              className={`px-2 py-1 text-xs ${modo === 'monto' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>$</button>
          </div>
          <input
            type="number" value={valor} onChange={e => setValor(e.target.value)} autoFocus
            placeholder={modo === 'porcentaje' ? '10' : '100'}
            className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={aplicar}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer">
            Aplicar
          </button>
          {item.descuentoManual_centavos !== null && (
            <button onClick={() => { setDescuentoManualItem(item.producto.id, null); setEditando(false) }}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white cursor-pointer">Quitar</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Cart() {
  const { items, subtotal, total, descuento_centavos, descuentoItems } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <ShoppingCart size={48} className="mb-3 text-slate-600" />
        <p className="text-sm font-medium text-slate-300">Carrito vacío</p>
        <p className="text-xs mt-1">Escaneá o seleccioná un producto</p>
      </div>
    )
  }

  const descItems = descuentoItems()

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {items.map(item => <CartRow key={item.producto.id} item={item} />)}
      </div>

      <div className="border-t border-slate-700 pt-3 space-y-2 shrink-0">
        <div className="flex justify-between text-slate-400 text-sm">
          <span>Subtotal</span><span>{formatCentavos(subtotal())}</span>
        </div>
        {descItems > 0 && (
          <div className="flex justify-between text-amber-400 text-sm">
            <span>Descuento ítems</span><span>− {formatCentavos(descItems)}</span>
          </div>
        )}
        {descuento_centavos > 0 && (
          <div className="flex justify-between text-amber-400 text-sm">
            <span>Descuento venta</span><span>− {formatCentavos(descuento_centavos)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline text-white pt-1">
          <span className="text-base font-semibold">Total</span>
          <span className="text-blue-400 text-2xl font-bold tabular-nums">{formatCentavos(total())}</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter desktop exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/Cart.tsx
git commit -m "feat(desktop): UI de descuento por ítem en el carrito"
```

---

### Task 12: Descuento global en el cobro + congelar al vender

**Files:**
- Modify: `apps/desktop/src/components/PaymentModal.tsx`

- [ ] **Step 1: Congelar el descuento efectivo por ítem en `venta_items` y el global en `venta`**

En `PaymentModal.tsx`, dentro de `confirmar()`, cambiar el armado de `ventaItems` y `DatosTicket.items` para usar el descuento del carrito (en vez del 0 de Fase 1). El `cartStore` ya expone `descuento_centavos` (global) e `items[].descuento_centavos` (efectivo por ítem):

```typescript
// ventaItems: usar el descuento efectivo del carrito
      const ventaItems: Omit<VentaItem, 'sync_status'>[] = items.map(item => ({
        id: crypto.randomUUID(),
        created_at: ts,
        local_id: localId,
        venta_id: ventaId,
        producto_id: item.producto.id,
        descripcion: item.producto.descripcion,
        precio_unit_centavos: item.producto.precio_centavos,
        categoria: item.producto.categoria,
        cantidad: item.cantidad,
        subtotal_centavos: item.subtotal_centavos,
        descuento_centavos: item.descuento_centavos,
      }))
```

```typescript
// DatosTicket.items: idem
        items: items.map(i => ({
          descripcion:          i.producto.descripcion,
          cantidad:             i.cantidad,
          precio_unit_centavos: i.producto.precio_centavos,
          categoria:            i.producto.categoria,
          subtotal_centavos:    i.subtotal_centavos,
          descuento_centavos:   i.descuento_centavos,
        })),
```

`venta.descuento_centavos` ya toma `descuento_centavos` del cartStore (descuento global). Verificar que el `total_centavos` use `total()` del store (ya considera ítems + global). Si `confirmar()` calcula `totalCentavos = total()`, no hay cambio extra.

- [ ] **Step 2: Agregar el campo de descuento global de la venta en el modal**

En el JSX de `PaymentModal`, antes del bloque de "Medio de pago", agregar un campo que use `setDescuento` del store:

```tsx
{/* Descuento global de la venta */}
<div className="mb-5">
  <label className="text-slate-300 text-sm font-medium block mb-1">Descuento (toda la venta)</label>
  <MoneyInput
    centavos={descuento_centavos}
    onChange={setDescuento}
    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-right
               focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
```

Para esto, en el `useCartStore` destructurar `descuento_centavos` y `setDescuento`:

```typescript
const { items, total, descuento_centavos, clear, setDescuento } = useCartStore()
```

(Reusa el componente `MoneyInput` ya existente en `apps/desktop/src/components/MoneyInput.tsx`.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter desktop exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación E2E manual**

Run: `pnpm --filter desktop tauri dev`
- Agregar productos, fijar `-%` y `-$` por ítem → baja el total y aparece "Descuento − $x" en la línea.
- Fijar descuento global en el cobro → aparece "Descuento venta".
- Confirmar venta → el ticket muestra `-$x` bajo los ítems con descuento y `DESCUENTO:` global.
- Reimprimir desde "Mis Ventas" → conserva exactamente los descuentos (congelados).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/PaymentModal.tsx
git commit -m "feat(desktop): descuento global en cobro + congelar descuentos al vender"
```

---

## Verificación final

- `pnpm --filter @kioscapp/shared test` → resolver verde.
- `pnpm typecheck` (turbo, todo el repo) → sin errores.
- `cargo check` en `apps/desktop/src-tauri` → sin errores (no se tocó Rust en esta fase; el ticket ya soporta las líneas de descuento de Fase 1).
- E2E: catálogo (dashboard) → pull → venta aplica prioridad correcta (manual > sucursal > global; producto > categoría) y congela; reimpresión conserva.

## Notas

- Importes siempre en centavos. `porcentaje` entero 1..100.
- No acumular descuentos: gana el de mayor prioridad; siempre clamp a `[0, subtotal]` y total `>= 0`.
- `venta_items` append-only: el descuento se congela al vender; la reimpresión nunca recalcula.
- Backend Next.js con breaking changes: leer `node_modules/next/dist/docs/` antes de tocar rutas/dashboard; usar Context7 para Drizzle/Next.
- `db:push` requiere `DATABASE_URL`; no hay carpeta `drizzle/` (el proyecto usa push, no migration files).
