---
name: KioscApp
description: POS offline-first de mostrador — interfaz oscura, densa y a prueba de apuro
colors:
  bg: "#020617"
  surface: "#0f172a"
  card: "#1e293b"
  border: "#334155"
  border-strong: "#475569"
  ink: "#f8fafc"
  muted: "#94a3b8"
  primary: "#2563eb"
  primary-bright: "#3b82f6"
  accent-price: "#60a5fa"
  success: "#22c55e"
  danger: "#ef4444"
  danger-text: "#f87171"
  warning: "#f59e0b"
typography:
  title:
    fontFamily: "'IBM Plex Sans', system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "'IBM Plex Sans', system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "'IBM Plex Sans', system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  mono:
    fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-bright}"
    textColor: "{colors.ink}"
  chip-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-idle:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  input-search:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  card-product:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px"
  nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
---

# Design System: KioscApp

## 1. Overview

**Creative North Star: "El Mostrador"**

KioscApp es la superficie de trabajo de una caja registradora, no una página de producto. La interfaz es un panel oscuro y quieto sobre el que la información de la venta aparece con contraste alto e inmediato: como un mostrador bien organizado de noche, donde cada cosa está donde el cajero la busca a ciegas. La estética sirve a la velocidad y a la confianza; nunca compite con la tarea.

El sistema es **denso pero honesto**: muestra lo que el mostrador necesita (carrito, precio, stock, estado de caja, sincronización) sin saturar, jerarquizando por tamaño y peso de texto, no por color recargado. El color es funcional: azul para lo accionable, verde para lo confirmado, rojo para lo destructivo o el error, ámbar para la advertencia. Todo lo demás es la rampa de grises fríos (slate) que construye profundidad por capas tonales, sin sombras.

Esto rechaza explícitamente el look de **SaaS genérico** (landing colorida, cards redondeadas decorativas, ilustraciones, gradientes de marketing) y el de **POS viejo de Windows** (gris sucio, botones 3D, biselados). No es vistoso ni nostálgico: es una herramienta seria para manejar plata.

**Key Characteristics:**
- Tema oscuro permanente, fondo casi negro (`#020617`), profundidad por capas de slate.
- Plano: sin sombras; la elevación se lee por color de superficie, no por blur.
- Acento azul único para lo accionable; semánticos (verde/rojo/ámbar) reservados a estado.
- Denso y táctil a la vez: targets cómodos (≥40px) con tipografía chica y precisa.
- Color nunca es el único portador de significado (daltonismo).

## 2. Colors

Paleta de grises fríos (slate) sobre negro, con un único acento azul accionable y tres semánticos de estado.

### Primary
- **Azul Acción** (`#2563eb`, blue-600): relleno de botones primarios, chip de categoría activo, ítem de navegación activo. Es el color de "esto se puede tocar y hace algo".
- **Azul Brillante** (`#3b82f6`, blue-500): estado hover del azul acción y anillo de foco (`focus:ring`). Marca interacción en curso.
- **Azul Precio** (`#60a5fa`, blue-400): exclusivo para importes en las tarjetas de producto. Distingue el dato "plata" de un vistazo.

### Neutral
- **Negro Mostrador** (`#020617`, slate-950): fondo raíz de toda la app.
- **Superficie** (`#0f172a`, slate-900): paneles estructurales, sidebar, barras.
- **Tarjeta** (`#1e293b`, slate-800): tarjetas de producto, inputs, chips inactivos; primera capa por encima del fondo.
- **Borde** (`#334155`, slate-700): divisores y borde de tarjeta en reposo.
- **Borde Fuerte** (`#475569`, slate-600): borde de inputs (más visible para el foco táctil).
- **Tinta** (`#f8fafc`, slate-50): texto principal, máximo contraste.
- **Apagado** (`#94a3b8`, slate-400): texto secundario, íconos en reposo, placeholders. Nunca por debajo de AA sobre tarjeta/superficie.

### Tertiary (semánticos de estado)
- **Verde Confirmado** (`#22c55e`): cobro exitoso, stock OK, caja abierta.
- **Rojo Peligro** (`#ef4444`): borde de error en input, acciones destructivas (anular, cerrar caja).
- **Rojo Texto** (`#f87171`, red-400): texto de error sobre fondo oscuro (más legible que el rojo pleno).
- **Ámbar Alerta** (`#f59e0b`): stock bajo, advertencias no bloqueantes.

### Named Rules
**La Regla del Acento Único.** El azul es el único color de marca. Si algo es azul, es accionable. No se usa azul decorativo. Los semánticos (verde/rojo/ámbar) jamás se usan por estética: solo comunican estado.

**La Regla del Doble Canal.** Ningún estado se comunica solo con color. Rojo/verde/ámbar siempre van acompañados de ícono, texto o forma. Un cajero daltónico debe poder operar sin perder información.

## 3. Typography

**Display / Body Font:** IBM Plex Sans (fallback `system-ui`, `sans-serif`) — bundled local, offline.
**Mono Font:** IBM Plex Mono (fallback `ui-monospace`, `Menlo`) — IDs, códigos y preview de ticket.

**Character:** IBM Plex Sans da identidad de marca sin perder seriedad: grotesca ingenieril, neutral-cálida, muy legible a tamaño chico en pantallas baratas de mostrador. Una sola superfamilia (Sans + Mono) evita familias que compiten; la jerarquía se construye con peso y tamaño. Se autohospeda (no depende de CDN) por la regla offline-first. **Cifras tabulares siempre** (`font-variant-numeric: tabular-nums`): las columnas de plata alinean dígito a dígito.

### Hierarchy
- **Title** (700, 1.125rem / `text-lg`, lh 1.2): títulos de pantalla y de modal, totales destacados.
- **Body** (400, 0.875rem / `text-sm`, lh 1.4): contenido general, nombres de producto, filas de tabla.
- **Label** (500, 0.75rem / `text-xs`, lh 1.3): chips, badges, etiquetas de campo, mensajes de error.
- **Mono** (400, 0.625rem / `text-[10px]`): IDs de caja, códigos de barras. Único uso de monoespaciada.

### Named Rules
**La Regla Sin Mayúsculas Sostenidas.** Nada de texto en ALL CAPS en cuerpo ni botones. Las etiquetas van en sentence case ("Cerrar caja", no "CERRAR CAJA"). La velocidad de lectura manda.

## 4. Elevation

El sistema es **plano**. No hay sombras (`box-shadow`) en ningún componente operativo. La profundidad se comunica por **capas tonales**: fondo `#020617` → superficie `#0f172a` → tarjeta `#1e293b`, cada paso un slate más claro. Cuanto más cerca del usuario, más claro. Los bordes (`#334155` / `#475569`) separan superficies del mismo nivel.

### Named Rules
**La Regla Plana.** Las superficies son planas en reposo. El estado (hover, foco) se comunica cambiando color de superficie o anillo de foco, nunca agregando sombra. Si parece un POS de 2008 con botones biselados, el bisel sobra.

## 5. Components

### Buttons
- **Shape:** esquinas redondeadas 12px (`rounded-xl`) en botones de acción; 8px (`rounded-lg`) en ítems de navegación.
- **Primary:** relleno Azul Acción (`#2563eb`), texto Tinta, padding `12px 16px`, peso 500.
- **Hover / Focus:** hover sube a Azul Brillante (`#3b82f6`) vía `transition-colors`; foco con `focus:ring-2` azul. Disabled: `opacity-50`.
- **Ghost (nav/secundarios):** sin relleno, texto Apagado; hover a `bg-slate-800` + texto Tinta.

### Chips (filtros de categoría)
- **Style:** píldora (`rounded-full`), `text-xs` peso 500, ícono + label, padding `4px 10px`.
- **State:** activo = relleno Azul Acción + texto Tinta; inactivo = `bg-slate-800` + texto Apagado, hover `bg-slate-700` + Tinta.

### Cards / Containers (tarjeta de producto)
- **Corner Style:** 12px (`rounded-xl`).
- **Background:** Tarjeta (`#1e293b`); hover sube a `slate-700`.
- **Shadow Strategy:** ninguna (ver Elevation).
- **Border:** 1px Borde (`#334155`); hover cambia a Azul Brillante (`#3b82f6`).
- **Internal Padding:** 12px (`p-3`). Ícono de categoría + nombre (2 líneas máx) + precio en Azul Precio.

### Inputs / Fields
- **Style:** fondo Tarjeta (`#1e293b`), borde Borde Fuerte (`#475569`), 12px (`rounded-xl`), padding `12px 16px`, placeholder Apagado.
- **Focus:** `focus:ring-2` Azul Brillante, sin sombra.
- **Error:** borde y anillo Rojo Peligro (`#ef4444`), mensaje en Rojo Texto debajo.

### Navigation (sidebar)
- **Style:** rail vertical angosto (56px), íconos sobre `bg-slate-900`, borde derecho. Ítem activo: relleno Azul Acción, alto 40px, `rounded-lg`. Inactivo: ícono Apagado, hover `bg-slate-800` + Tinta. Tooltips al hover (texto a la derecha, `rounded` 4px).

## 6. Do's and Don'ts

### Do:
- **Do** mantener tema oscuro con fondo `#020617` y profundidad por capas de slate.
- **Do** usar el azul **solo** para lo accionable; reservar verde/rojo/ámbar para estado.
- **Do** acompañar todo estado de color con ícono o texto (daltonismo).
- **Do** garantizar contraste WCAG AA: texto cuerpo sobre tarjeta/superficie ≥4.5:1; nada de slate-500 sobre slate-900 para texto legible.
- **Do** usar targets ≥40px y radios 8–12px; pill solo para chips/tags.
- **Do** respetar `prefers-reduced-motion`; transiciones de color cortas, sin coreografía.

### Don't:
- **Don't** caer en el look de **SaaS genérico**: landing colorida, gradientes de marketing, ilustraciones, cards redondeadas decorativas. Esto es una caja, no un sitio de producto.
- **Don't** parecer un **POS viejo de Windows**: gris sucio, botones 3D/biselados, sombras duras.
- **Don't** agregar `box-shadow` decorativo; el sistema es plano (capas tonales).
- **Don't** usar `border-radius` ≥ 16px en tarjetas/inputs (tope 12px); el full-pill es solo para chips.
- **Don't** usar texto gris claro "elegante" que baje del contraste AA.
- **Don't** depender solo del color rojo/verde para comunicar stock, errores o estados.
- **Don't** usar mayúsculas sostenidas en botones ni cuerpo.
