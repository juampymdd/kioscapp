# Product

## Register

product

## Users

Cajeros y dueños de kioscos y comercios chicos en Argentina. Operan de pie en el mostrador, con apuro, manos a veces ocupadas, atendiendo clientes en vivo. No son usuarios técnicos. Trabajan en un entorno híbrido: pantalla táctil más teclado y lector de código de barras. El local puede tener luz variable y pantallas baratas, y la conexión a internet puede caerse en cualquier momento.

El trabajo a resolver: vender rápido y sin errores. Cobrar, dar vuelto, manejar carrito, abrir y cerrar caja, controlar stock y ver el historial de ventas, todo disponible aunque no haya internet (offline-first con SQLite local, sincronización posterior con el backend central).

## Product Purpose

KioscApp es un POS offline-first de escritorio (Tauri + React) para la operación diaria del mostrador. Existe porque los kioscos necesitan vender de forma confiable incluso sin conexión, y consolidar después contra un backend central. El éxito se mide en velocidad de venta, cero pérdida de datos y confianza del cajero en cada cobro. Reglas de dominio que el diseño debe respetar: importes en centavos, ventas append-only (una anulación es un nuevo movimiento, no una edición), IDs UUID desde el cliente.

## Brand Personality

Rápida y confiable. Es una herramienta de trabajo seria, no una web vistosa. Tono: directo, sin adornos, sin fricción. El cajero debe sentir que la app nunca lo traiciona y que cada acción es inmediata. Voz de la interfaz: clara y económica, en castellano rioplatense, etiquetas con verbo + objeto ("Cobrar", "Cerrar caja", "Anular venta").

## Anti-references

- **SaaS genérico**: nada de landing colorida, cards redondeadas decorativas, ilustraciones, gradientes de marketing o look de web de startup. Esto es una caja registradora, no un sitio de producto.
- Por extensión: nada recargado ni animado de más (sin glassmorphism decorativo, sin efectos que distraigan del trabajo) ni look de juguete (exceso de color/emojis que reste seriedad al manejo de plata).

## Design Principles

- **Velocidad antes que decoración**: cada pantalla optimiza la tarea principal del cajero. Menos clics, foco predecible, atajos de teclado y lector siempre activos.
- **Confianza visible**: el estado del sistema (caja abierta, sincronización, stock bajo, cobro confirmado) siempre claro y a la vista. Nunca dejar al cajero adivinando si una venta entró.
- **A prueba de apuro**: targets grandes y cómodos al tacto, acciones destructivas (anular, cerrar caja) con confirmación, errores difíciles de cometer.
- **Densidad honesta**: mostrar la info que el mostrador necesita sin saturar; jerarquía por tamaño y peso, no por color recargado.
- **Offline es normal, no excepción**: la falta de conexión es un estado esperado y tranquilo, no una alarma.

## Accessibility & Inclusion

- **Contraste WCAG AA** mínimo (cuerpo ≥4.5:1, texto grande ≥3:1). Entorno con luz variable y pantallas baratas: nada de gris claro "elegante" sobre fondo oscuro que no se lee.
- **Targets grandes**: áreas clicables amplias (≥44px en acciones de mostrador) por el uso táctil y apurado.
- **No depender solo del color**: stock, estados y alertas (rojo/verde) deben llevar también ícono, texto o forma, por daltonismo.
- **Reduced motion**: respetar `prefers-reduced-motion`; sin animaciones que cansen en jornadas largas.
