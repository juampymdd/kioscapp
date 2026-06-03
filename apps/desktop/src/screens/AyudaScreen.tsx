import { useState } from 'react'
import {
  BookOpen, Info, Power, ShoppingCart, Banknote, Printer, Package, Tags, Boxes,
  Truck, Tag, Receipt, BarChart2, LogOut, WifiOff, Keyboard, AlertCircle, List,
  type LucideIcon,
} from 'lucide-react'
import ScreenHeader from '../components/ScreenHeader'

/* ── Helpers de prosa ─────────────────────────────────────────────────────── */

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-300 leading-relaxed">{children}</p>
}

function Pasos({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 leading-relaxed marker:text-slate-500">{children}</ol>
}

function Lista({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1 text-slate-300 leading-relaxed marker:text-slate-600">{children}</ul>
}

function B({ children }: { children: React.ReactNode }) {
  return <span className="text-white font-medium">{children}</span>
}

/* ── Secciones del manual ─────────────────────────────────────────────────── */

interface Seccion {
  id: string
  titulo: string
  Icon: LucideIcon
  cuerpo: React.ReactNode
}

const SECCIONES: Seccion[] = [
  {
    id: 'bienvenida',
    titulo: 'Bienvenida',
    Icon: Info,
    cuerpo: (
      <div className="space-y-3">
        <P>KioscApp es tu caja para vender en el mostrador: cobrás, controlás el stock y llevás la cuenta del día.</P>
        <P>Lo más importante: <B>funciona aunque se corte internet</B>. Podés vender igual y todo se guarda. Cuando vuelve la conexión, se pone al día solo.</P>
        <P>Esta ayuda explica, paso a paso, cómo usar cada parte. Usá el índice de la izquierda para ir directo a lo que necesités.</P>
      </div>
    ),
  },
  {
    id: 'abrir-caja',
    titulo: 'Abrir la caja',
    Icon: Power,
    cuerpo: (
      <div className="space-y-3">
        <P>Al empezar el día o el turno, abrís la caja para poder vender.</P>
        <Pasos>
          <li>Escribí cuánto efectivo tenés para empezar (el cambio inicial).</li>
          <li>Tocá <B>Abrir caja</B>.</li>
        </Pasos>
        <P>Listo, ya podés cobrar. Si te equivocaste con el monto inicial, lo arreglás al cerrar la caja.</P>
      </div>
    ),
  },
  {
    id: 'vender',
    titulo: 'Vender',
    Icon: ShoppingCart,
    cuerpo: (
      <div className="space-y-3">
        <P>La pantalla <B>Ventas POS</B> es donde armás cada venta.</P>
        <Pasos>
          <li>Pasá el producto por el lector de código, o escribí su nombre en el buscador de arriba.</li>
          <li>Tocá el producto para sumarlo al carrito (la lista de la derecha).</li>
          <li>Para cambiar la cantidad usá los botones <B>−</B> y <B>+</B>. Para sacar algo, tocá la <B>X</B>.</li>
          <li>Si querés hacer una rebaja a un producto puntual, tocá el botón <B>%</B> de esa fila y poné el descuento.</li>
        </Pasos>
        <P>Abajo del carrito ves el <B>Total</B> en todo momento.</P>
      </div>
    ),
  },
  {
    id: 'cobrar',
    titulo: 'Cobrar',
    Icon: Banknote,
    cuerpo: (
      <div className="space-y-3">
        <Pasos>
          <li>Cuando terminaste de cargar, tocá <B>Cobrar</B>.</li>
          <li>Elegí el medio de pago: efectivo, débito, crédito o QR.</li>
          <li>Si es <B>efectivo</B>, escribí cuánto te dio el cliente y la app te muestra el <B>vuelto</B>.</li>
          <li>Tocá <B>Confirmar</B>. La venta queda registrada.</li>
        </Pasos>
        <P>Si te confundiste antes de confirmar, podés cerrar la ventana y corregir el carrito.</P>
      </div>
    ),
  },
  {
    id: 'ticket',
    titulo: 'El ticket',
    Icon: Printer,
    cuerpo: (
      <div className="space-y-3">
        <P>Después de cobrar, aparece el ticket para imprimir.</P>
        <Lista>
          <li>Tocá <B>Imprimir</B> para sacarlo, o <B>Sin ticket</B> si el cliente no lo quiere.</li>
          <li>En esa misma ventana podés elegir la <B>impresora</B> y el <B>ancho del papel</B>: 58 mm (el chico, el más común) u 80 mm (el grande, tipo supermercado).</li>
          <li>Lo que elijas queda guardado para las próximas ventas.</li>
        </Lista>
        <P>¿No sabés qué ancho tenés? Mirá el rollo: si el papel mide alrededor de 5,5 cm es 58 mm; si mide cerca de 8 cm es 80 mm.</P>
      </div>
    ),
  },
  {
    id: 'productos',
    titulo: 'Productos',
    Icon: Package,
    cuerpo: (
      <div className="space-y-3">
        <P>En <B>Productos</B> cargás y editás lo que vendés.</P>
        <Lista>
          <li>Tocá <B>Nuevo</B> para agregar uno: nombre, código de barras (opcional), categoría y precio.</li>
          <li>Marcá <B>Fraccionable (kg)</B> si se vende por peso (por ejemplo, caramelos sueltos).</li>
          <li>Para cambiar algo, tocá el producto en la lista y editá.</li>
          <li>Si dejás de vender un producto, podés <B>desactivarlo</B>: deja de aparecer al vender pero no se borra.</li>
        </Lista>
      </div>
    ),
  },
  {
    id: 'categorias',
    titulo: 'Categorías',
    Icon: Tags,
    cuerpo: (
      <div className="space-y-3">
        <P>Las categorías agrupan tus productos (bebidas, golosinas, cigarrillos, etc.) para encontrarlos rápido y ordenar el ticket.</P>
        <Lista>
          <li>Tocá <B>Nueva</B> para crear una: ponele un nombre y elegí un ícono.</li>
          <li>Podés ordenarlas y desactivar las que no uses.</li>
        </Lista>
        <P>Después, al cargar un producto, elegís a qué categoría pertenece.</P>
      </div>
    ),
  },
  {
    id: 'stock',
    titulo: 'Stock',
    Icon: Boxes,
    cuerpo: (
      <div className="space-y-3">
        <P>En <B>Stock</B> llevás cuántas unidades te quedan de cada producto.</P>
        <Lista>
          <li>Ajustá la <B>cantidad</B> con los botones o escribiendo el número, y tocá <B>Guardar</B>.</li>
          <li>La <B>alerta mínima</B> es el número a partir del cual querés que te avise. Por ejemplo, si ponés 5, cuando queden 5 o menos te marca <B>Bajo</B>.</li>
          <li>Arriba de la pantalla aparece un aviso cuando hay productos con stock bajo, para que repongas a tiempo.</li>
        </Lista>
      </div>
    ),
  },
  {
    id: 'proveedores',
    titulo: 'Proveedores',
    Icon: Truck,
    cuerpo: (
      <div className="space-y-3">
        <P>En <B>Proveedores</B> guardás los datos de a quién le comprás.</P>
        <Lista>
          <li>Tocá <B>Nuevo</B> y cargá nombre, teléfono, email y notas.</li>
          <li>Sirve para tenerlos a mano cuando necesitás reponer mercadería.</li>
        </Lista>
      </div>
    ),
  },
  {
    id: 'promociones',
    titulo: 'Promociones',
    Icon: Tag,
    cuerpo: (
      <div className="space-y-3">
        <P>En <B>Promociones</B> armás descuentos que se aplican solos al vender.</P>
        <Lista>
          <li>Elegí si el descuento es para una <B>categoría</B> entera o para un <B>producto</B> puntual.</li>
          <li>Indicá si es un <B>porcentaje</B> (ej: 10%) o un <B>monto fijo</B> (ej: $100).</li>
          <li>Podés activar o desactivar cada promoción cuando quieras.</li>
        </Lista>
        <P>Mientras esté activa, el descuento se resta automáticamente en la venta.</P>
      </div>
    ),
  },
  {
    id: 'mis-ventas',
    titulo: 'Mis ventas',
    Icon: Receipt,
    cuerpo: (
      <div className="space-y-3">
        <P>En <B>Mis ventas</B> ves el historial de lo que vendiste.</P>
        <Lista>
          <li>Filtrá por <B>período</B> (hoy, ayer, 7 días, 30 días o fechas a elección) y por <B>medio de pago</B>.</li>
          <li>Tocá una venta para ver el detalle de los productos.</li>
          <li>Podés <B>reimprimir</B> el ticket de cualquier venta.</li>
          <li>Una venta <B>anulada</B> es una que se dio de baja; queda marcada y no suma al total.</li>
        </Lista>
      </div>
    ),
  },
  {
    id: 'reportes',
    titulo: 'Reportes',
    Icon: BarChart2,
    cuerpo: (
      <div className="space-y-3">
        <P>En <B>Reportes</B> ves cómo venís vendiendo.</P>
        <Lista>
          <li>El total y la cantidad de ventas de <B>hoy</B>, con el detalle por medio de pago.</li>
          <li>Un gráfico con la tendencia de los <B>últimos 7 días</B>.</li>
        </Lista>
      </div>
    ),
  },
  {
    id: 'cerrar-caja',
    titulo: 'Cerrar la caja',
    Icon: LogOut,
    cuerpo: (
      <div className="space-y-3">
        <P>Al terminar el día o el turno, cerrás la caja para hacer el arqueo.</P>
        <Pasos>
          <li>Abrí <B>Cerrar caja</B> (abajo a la izquierda).</li>
          <li>Contá el efectivo real que tenés en el cajón y escribí ese número.</li>
          <li>Mirá el resumen del día y confirmá el cierre.</li>
        </Pasos>
        <P>Para volver a vender, abrís una caja nueva.</P>
      </div>
    ),
  },
  {
    id: 'sin-internet',
    titulo: 'Sin internet',
    Icon: WifiOff,
    cuerpo: (
      <div className="space-y-3">
        <P>Si se corta internet, <B>seguí vendiendo normal</B>. No pierdas tiempo: la app guarda todo en la computadora.</P>
        <P>Cuando vuelve la conexión, se pone al día sola con el sistema central. Arriba a la izquierda ves el estado: si dice sincronizado, está todo subido; si hay un número, son las ventas que faltan subir (se suben solas).</P>
      </div>
    ),
  },
  {
    id: 'atajos',
    titulo: 'Atajos de teclado',
    Icon: Keyboard,
    cuerpo: (
      <div className="space-y-3">
        <P>Para vender más rápido:</P>
        <Lista>
          <li>El <B>lector de código</B> escanea y, al apretar <B>Enter</B>, suma el producto al carrito.</li>
          <li>En los montos (lo recibido, el inicio de caja) escribí con los <B>números</B> del teclado.</li>
          <li><B>Borrar</B> corrige el último número. <B>Esc</B> pone el monto en cero.</li>
        </Lista>
      </div>
    ),
  },
  {
    id: 'problemas',
    titulo: 'Problemas comunes',
    Icon: AlertCircle,
    cuerpo: (
      <div className="space-y-3">
        <Lista>
          <li><B>No imprime el ticket:</B> fijate que la impresora esté encendida y con papel, y que esté elegida en la ventana del ticket (o en Configuración).</li>
          <li><B>No aparece un producto al vender:</B> cargalo en la pantalla Productos. Revisá que esté activo.</li>
          <li><B>No hay internet:</B> vendé igual. Se sube todo solo cuando vuelve la conexión.</li>
          <li><B>No puedo vender:</B> revisá que haya una caja abierta. Si no, abrila desde el inicio.</li>
          <li><B>Sale un número raro en un precio:</B> revisá el producto en Productos y corregí el precio.</li>
        </Lista>
      </div>
    ),
  },
  {
    id: 'glosario',
    titulo: 'Glosario',
    Icon: List,
    cuerpo: (
      <div className="space-y-3">
        <Lista>
          <li><B>Caja:</B> el turno de ventas. Se abre al empezar y se cierra al terminar, con el conteo del efectivo.</li>
          <li><B>Punto de venta:</B> esta computadora con la app. Cada local puede tener varias.</li>
          <li><B>Sucursal:</B> el local o negocio. Puede tener uno o varios puntos de venta.</li>
          <li><B>Anular:</B> dar de baja una venta ya hecha. Queda registrada como anulada.</li>
          <li><B>Fraccionable:</B> producto que se vende por peso (kg), no por unidad.</li>
          <li><B>Medio de pago:</B> cómo pagó el cliente (efectivo, débito, crédito, QR).</li>
        </Lista>
      </div>
    ),
  },
]

/* ── Pantalla ─────────────────────────────────────────────────────────────── */

export default function AyudaScreen() {
  const [activa, setActiva] = useState(SECCIONES[0].id)

  function ir(id: string) {
    setActiva(id)
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <ScreenHeader
        Icon={BookOpen}
        title="Ayuda"
        subtitle="Manual de uso de KioscApp"
      />

      <div className="flex-1 flex min-h-0">
        {/* Índice */}
        <nav className="w-56 shrink-0 border-r border-slate-800 overflow-y-auto p-3 space-y-0.5">
          {SECCIONES.map(({ id, titulo, Icon }) => (
            <button
              key={id}
              onClick={() => ir(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left
                          transition-colors cursor-pointer
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                          ${activa === id
                            ? 'bg-blue-600/15 text-blue-300'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="truncate">{titulo}</span>
            </button>
          ))}
        </nav>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8 space-y-12">
            {SECCIONES.map(({ id, titulo, Icon, cuerpo }) => (
              <section key={id} id={`sec-${id}`} className="scroll-mt-6">
                <h2 className="flex items-center gap-2.5 text-white text-xl font-bold mb-4">
                  <span className="w-8 h-8 grid place-items-center rounded-lg bg-blue-600/15 text-blue-400 shrink-0">
                    <Icon size={17} />
                  </span>
                  {titulo}
                </h2>
                {cuerpo}
              </section>
            ))}
            <p className="text-slate-600 text-xs pt-4 border-t border-slate-800">
              ¿Algo no quedó claro? Consultá con quien te configuró la app.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
