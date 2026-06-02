# Descripcion del proyecto

## Descripcion corta

KioscApp es un sistema POS offline-first para kioscos en Argentina. Permite vender desde una aplicacion de escritorio aun sin conexion a internet y sincronizar luego la informacion con un backend central para consolidar ventas, stock, caja y administracion del negocio.

## Descripcion larga

KioscApp es una plataforma de punto de venta pensada para kioscos y comercios chicos que necesitan operar de forma rapida, confiable y disponible incluso cuando no hay internet. El proyecto combina una aplicacion desktop nativa para la operacion diaria del local con un backend central encargado de consolidar datos, administrar sucursales y servir como base para reportes, configuracion y sincronizacion.

La aplicacion de escritorio esta construida con Tauri, React y Vite. Su objetivo principal es cubrir el flujo operativo del mostrador: venta de productos, manejo de carrito, cobro, apertura y cierre de caja, control de stock, alertas de inventario, proveedores, historial de ventas, tickets y estado de sincronizacion. La app trabaja con almacenamiento local mediante SQLite, lo que permite que cada punto de venta siga funcionando aunque el comercio pierda conectividad.

El backend esta desarrollado con Next.js, Drizzle ORM y PostgreSQL. Centraliza la informacion generada por los puntos de venta, incluyendo productos, stock, cajas, ventas, movimientos de caja, proveedores, usuarios, sucursales y puntos de venta. Tambien define las reglas de persistencia y sincronizacion necesarias para que los datos locales puedan integrarse con la base central cuando vuelve la conexion.

El proyecto esta organizado como un monorepo con pnpm y Turborepo. Incluye una aplicacion backend, una aplicacion desktop y un paquete compartido de tipos TypeScript (`@kioscapp/shared`) que mantiene consistencia entre ambos lados del sistema. Esta estructura facilita evolucionar el producto sin duplicar definiciones de dominio ni romper contratos entre la app local y el servidor.

KioscApp aplica reglas importantes para proteger la integridad de los datos comerciales: los importes se almacenan en centavos para evitar errores de punto flotante, los identificadores se generan como UUID desde el cliente, y las ventas se tratan como registros append-only, de modo que una anulacion se registra como un nuevo movimiento en lugar de modificar la venta original. Estas decisiones apuntan a mantener trazabilidad, robustez y coherencia en escenarios reales de caja.

En conjunto, KioscApp busca ofrecer una solucion de gestion comercial simple pero solida para kioscos: una caja local siempre disponible para vender, una base central para consolidar y administrar, y una arquitectura preparada para sumar sincronizacion bidireccional, reportes, facturacion electronica, usuarios, proveedores y otras necesidades propias del comercio minorista argentino.
