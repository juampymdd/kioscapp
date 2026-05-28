# KioscApp

Sistema POS offline-first para kioscos en Argentina. Cada local puede vender sin internet; el backend central consolida los datos cuando hay conexión.

## Arquitectura

```
kioscapp/
├── apps/
│   ├── backend/    — Next.js 16 + Drizzle ORM + PostgreSQL (API + panel admin)
│   └── desktop/   — Tauri 2 + React 19 + Vite 7 (app de venta local)
└── packages/
    └── shared/    — @kioscapp/shared (tipos TypeScript compartidos)
```

**Flujo de datos:**

```
[Desktop / SQLite local]  ←sync→  [Backend / PostgreSQL]
       ↑                                    ↑
  Ventas offline                     Consolidación
  Siempre disponible                 Panel admin
```

**Reglas invariantes:**
- El dinero se almacena en **centavos** (entero), nunca como float.
- Los IDs son **UUIDs generados en el cliente**, nunca autoincrement.
- Las ventas son **append-only**: para anular, se registra una venta de anulación; nunca se edita.
- Tauri no corre Node.js — SQLite en el local se maneja via `@tauri-apps/plugin-sql` (Rust), nunca Drizzle ni Prisma en la app desktop.

---

## Requisitos previos

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| Node.js | 20+ | Backend y tooling |
| pnpm | 9+ | Package manager del monorepo |
| Rust + Cargo | stable | Compilar Tauri |
| PostgreSQL | 15+ | Base de datos del backend |

### Instalar pnpm (si no lo tenés)

```bash
npm install -g pnpm
```

### Instalar Rust (si no lo tenés)

```bash
# Windows
winget install Rustlang.Rust.MSVC

# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

---

## Setup inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd kioscapp
pnpm install
```

### 2. Configurar el backend

Crear `apps/backend/.env.local`:

```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/kioscapp
```

Crear la base de datos en PostgreSQL:

```sql
CREATE DATABASE kioscapp;
```

Aplicar el schema:

```bash
pnpm --filter backend db:push
```

---

## Desarrollo

### Levantar el backend (Next.js)

```bash
pnpm dev:backend
# disponible en http://localhost:3000
```

### Levantar la app desktop (Tauri)

> Requiere que el backend esté corriendo si querés probar la sincronización.

```bash
pnpm dev:desktop
# abre la ventana nativa de Tauri con hot-reload
```

### Levantar todo junto (en terminales separadas)

```bash
# Terminal 1
pnpm dev:backend

# Terminal 2
pnpm dev:desktop
```

---

## Comandos útiles

### Base de datos (backend)

```bash
# Aplicar cambios del schema sin generar migraciones (útil en dev)
pnpm --filter backend db:push

# Generar migraciones SQL
pnpm --filter backend db:generate

# Ejecutar migraciones
pnpm --filter backend db:migrate

# Abrir Drizzle Studio (explorador visual de la BD)
pnpm --filter backend db:studio
```

### Verificación de tipos

```bash
# Todo el monorepo (via Turborepo)
pnpm typecheck

# Solo backend
pnpm --filter backend typecheck

# Solo desktop
pnpm --filter desktop typecheck
```

### Lint

```bash
pnpm lint
```

---

## Build de producción

### Backend

```bash
pnpm --filter backend build
pnpm --filter backend start
```

El backend se puede deployar en cualquier plataforma que soporte Next.js (Vercel, Railway, VPS con PM2, etc.).

### Desktop (instalador nativo)

```bash
pnpm --filter desktop tauri build
```

Genera los instaladores en `apps/desktop/src-tauri/target/release/bundle/`:

| Plataforma | Formato |
|---|---|
| Windows | `.msi` y `.exe` (NSIS) |
| macOS | `.dmg` y `.app` |
| Linux | `.deb`, `.rpm`, `.AppImage` |

> El build de Tauri compila el código Rust; la primera vez puede tardar varios minutos.

---

## Estructura de cada app

### `apps/backend`

```
apps/backend/
├── src/
│   ├── app/           — App Router de Next.js (páginas y API routes)
│   └── db/
│       └── schema.ts  — Schema de Drizzle ORM
├── drizzle/           — Migraciones SQL generadas
└── drizzle.config.ts  — Configuración de Drizzle Kit
```

### `apps/desktop`

```
apps/desktop/
├── src/               — Frontend React + Vite
└── src-tauri/
    ├── src/           — Código Rust (comandos Tauri)
    ├── Cargo.toml     — Dependencias Rust
    └── tauri.conf.json — Configuración de la app nativa
```

### `packages/shared`

Tipos TypeScript compartidos entre backend y desktop. Se importa como `@kioscapp/shared`.

---

## Variables de entorno

### Backend (`apps/backend/.env.local`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://user:pass@host:5432/db` |

---

## Fases del proyecto

- [x] **Fase 0** — Andamiaje del monorepo (completada)
- [ ] **Fase 1** — SQLite schema + DataStore + flujo de venta offline
- [ ] **Fase 2** — Backend Next.js + schema Drizzle + endpoints de sincronización
- [ ] **Fase 3** — Módulo de sincronización bidireccional
- [ ] **Fase 4** — AFIP / factura electrónica (WSFE)
- [ ] **Fase 5** — Usuarios, fiado, proveedores

---

## Troubleshooting

**`pnpm dev:desktop` falla con error de Rust**
Asegurate de tener el toolchain `stable` de Rust instalado y actualizado:
```bash
rustup update stable
```

**Error de conexión a PostgreSQL**
Verificá que el servicio esté corriendo y que `DATABASE_URL` en `.env.local` sea correcta.

**Cambios en `@kioscapp/shared` no se reflejan**
Turborepo cachea los builds. Forzá un rebuild:
```bash
pnpm --filter @kioscapp/shared build
```

**La primera compilación de Tauri es muy lenta**
Normal. Cargo descarga y compila las dependencias Rust desde cero. Las compilaciones siguientes usan el cache de `target/`.
