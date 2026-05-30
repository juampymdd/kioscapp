'use client'

import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

/* ---------- helpers ---------- */

const moneyFmt = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
})
const money = (n: number) => moneyFmt.format(n ?? 0)

function moneyAxis(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

const AXIS = { fill: '#64748b', fontSize: 12 }
const GRID = '#1e293b'
const CURSOR = { fill: '#1e293b66' }

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

const legendLabel = (v: string) => <span className="text-slate-300 text-xs">{v}</span>

/* ---------- tooltips (nivel de módulo: no se crean en render) ---------- */

interface Row {
  name?: string; fecha?: string; hora?: string
  montoPesos?: number; cantidad?: number; pct?: number
}
interface TipProps {
  active?: boolean
  payload?: readonly { payload?: Row }[]
  label?: string | number
  accent?: string
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      {children}
    </div>
  )
}

function MoneyCountTooltip({ active, payload, label, accent = 'text-blue-400' }: TipProps) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload ?? {}
  return (
    <Shell>
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      <p className={accent}>{money(r.montoPesos ?? 0)}</p>
      <p className="text-slate-400">{r.cantidad ?? 0} venta{r.cantidad !== 1 ? 's' : ''}</p>
    </Shell>
  )
}
const HoraTooltip = (p: TipProps) => <MoneyCountTooltip {...p} accent="text-emerald-400" />
const SucursalTooltip = (p: TipProps) => <MoneyCountTooltip {...p} accent="text-purple-400" />

function ProductoTooltip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload ?? {}
  return (
    <Shell>
      <p className="text-slate-200 font-medium">{r.name}</p>
      <p className="text-blue-400">{money(r.montoPesos ?? 0)}</p>
      <p className="text-slate-400">{r.cantidad ?? 0} u. vendidas</p>
    </Shell>
  )
}

function ShareTooltip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload ?? {}
  return (
    <Shell>
      <p className="text-slate-200 font-medium">{r.name}</p>
      <p className="text-slate-400">{money(r.montoPesos ?? 0)} · {r.pct ?? 0}%</p>
      {typeof r.cantidad === 'number' && (
        <p className="text-slate-500">{r.cantidad} venta{r.cantidad !== 1 ? 's' : ''}</p>
      )}
    </Shell>
  )
}

function Empty() {
  return (
    <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm">
      Sin datos en el período
    </div>
  )
}

const withPct = <T extends { montoPesos: number }>(data: T[]) => {
  const total = data.reduce((s, d) => s + d.montoPesos, 0)
  return data.map(d => ({ ...d, pct: total > 0 ? Math.round((d.montoPesos / total) * 100) : 0 }))
}

/* ---------- 1. Ventas por día (área) ---------- */

export function VentasPorDiaChart({ data }: { data: { fecha: string; montoPesos: number; cantidad: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="fecha" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={4} minTickGap={16} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={moneyAxis} />
        <Tooltip content={MoneyCountTooltip} />
        <Area type="monotone" dataKey="montoPesos" stroke="#3b82f6" strokeWidth={2} fill="url(#gradVentas)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ---------- 2. Medios de pago (donut) ---------- */

export function MediosPagoChart({ data }: { data: { name: string; montoPesos: number; cantidad: number }[] }) {
  if (!data.length) return <Empty />
  const d = withPct(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={d} dataKey="montoPesos" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="none">
          {d.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip content={ShareTooltip} />
        <Legend verticalAlign="bottom" iconType="circle" formatter={legendLabel} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/* ---------- 3. Ventas por hora (barras) ---------- */

export function VentasPorHoraChart({ data }: { data: { hora: string; montoPesos: number; cantidad: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="hora" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={moneyAxis} />
        <Tooltip content={HoraTooltip} cursor={CURSOR} />
        <Bar dataKey="montoPesos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ---------- 4. Top productos (barras horizontales) ---------- */

const truncName = (s: string) => (s.length > 18 ? s.slice(0, 17) + '…' : s)

export function TopProductosChart({ data }: { data: { name: string; montoPesos: number; cantidad: number }[] }) {
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={moneyAxis} />
        <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={120} tickFormatter={truncName} />
        <Tooltip content={ProductoTooltip} cursor={CURSOR} />
        <Bar dataKey="montoPesos" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ---------- 5. Ventas por sucursal (barras) ---------- */

export function SucursalChart({ data }: { data: { name: string; montoPesos: number; cantidad: number }[] }) {
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={moneyAxis} />
        <Tooltip content={SucursalTooltip} cursor={CURSOR} />
        <Bar dataKey="montoPesos" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ---------- 6. Ventas por categoría (donut) ---------- */

export function CategoriaChart({ data }: { data: { name: string; montoPesos: number }[] }) {
  if (!data.length) return <Empty />
  const d = withPct(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={d} dataKey="montoPesos" nameKey="name" cx="50%" cy="50%" outerRadius={92} paddingAngle={2} stroke="none">
          {d.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip content={ShareTooltip} />
        <Legend verticalAlign="bottom" iconType="circle" formatter={legendLabel} />
      </PieChart>
    </ResponsiveContainer>
  )
}
