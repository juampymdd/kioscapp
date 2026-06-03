/**
 * Catálogo curado de íconos lucide para rubros de kiosco/almacén,
 * con palabras de búsqueda en español (sin acentos).
 * `name` = ícono lucide (PascalCase). `q` = términos para filtrar.
 */
export interface IconoTienda {
  name: string
  q: string
}

export const ICONOS_TIENDA: IconoTienda[] = [
  // Bebidas
  { name: 'GlassWater',    q: 'agua bebida vaso mineral soda' },
  { name: 'CupSoda',       q: 'gaseosa refresco bebida coca soda vaso' },
  { name: 'Coffee',        q: 'cafe te mate infusion taza caliente' },
  { name: 'Beer',          q: 'cerveza birra alcohol chopp' },
  { name: 'Wine',          q: 'vino alcohol copa bebida' },
  { name: 'Martini',       q: 'trago bebida coctel alcohol fernet' },
  { name: 'Milk',          q: 'leche lacteo lacteos' },
  { name: 'Droplet',       q: 'agua liquido jugo gota' },

  // Comida / kiosco
  { name: 'Candy',         q: 'golosina caramelo dulce chupetin' },
  { name: 'Cookie',        q: 'galletita galleta dulce cookie' },
  { name: 'IceCreamCone',  q: 'helado postre dulce' },
  { name: 'Cake',          q: 'torta pastel cumpleanos postre' },
  { name: 'CakeSlice',     q: 'torta porcion postre' },
  { name: 'Croissant',     q: 'factura medialuna panaderia desayuno' },
  { name: 'Donut',         q: 'dona rosquilla dulce' },
  { name: 'Popcorn',       q: 'pochoclo pororo maiz snack' },
  { name: 'Sandwich',      q: 'sandwich sanguche comida' },
  { name: 'Pizza',         q: 'pizza comida porcion' },
  { name: 'Salad',         q: 'ensalada verdura comida sana' },
  { name: 'Beef',          q: 'carne fiambre milanesa res' },
  { name: 'Ham',           q: 'fiambre jamon embutido' },
  { name: 'Drumstick',     q: 'pollo carne comida' },
  { name: 'Fish',          q: 'pescado pesca comida' },
  { name: 'Egg',           q: 'huevo huevos granja' },
  { name: 'Apple',         q: 'fruta manzana verduleria' },
  { name: 'Carrot',        q: 'verdura zanahoria verduleria' },
  { name: 'Wheat',         q: 'pan harina cereal panaderia trigo' },
  { name: 'Soup',          q: 'sopa caldo comida' },
  { name: 'Utensils',      q: 'comida cubiertos restaurante rotiseria' },

  // Cigarrillos
  { name: 'Cigarette',     q: 'cigarrillo tabaco fumar pucho' },
  { name: 'Flame',         q: 'encendedor fuego fosforo' },

  // Almacen / general
  { name: 'ShoppingBag',   q: 'bolsa compra kiosco almacen varios' },
  { name: 'ShoppingCart',  q: 'carrito compra super mercado' },
  { name: 'Store',         q: 'tienda local negocio kiosco' },
  { name: 'Package',       q: 'paquete varios caja producto' },
  { name: 'Box',           q: 'caja producto almacen' },
  { name: 'Gift',          q: 'regalo presente obsequio' },
  { name: 'Newspaper',     q: 'diario revista periodico' },
  { name: 'BookOpen',      q: 'libro libreria revista' },

  // Limpieza / hogar
  { name: 'SprayCan',      q: 'limpieza aerosol spray desodorante' },
  { name: 'Bubbles',       q: 'limpieza jabon detergente espuma' },
  { name: 'WashingMachine',q: 'lavandina limpieza ropa hogar' },

  // Higiene / farmacia
  { name: 'Pill',          q: 'remedio pastilla farmacia medicamento' },
  { name: 'Bandage',       q: 'curita farmacia salud' },
  { name: 'HeartPulse',    q: 'salud farmacia medico' },
  { name: 'Baby',          q: 'bebe panal mamadera' },

  // Servicios / recargas
  { name: 'Smartphone',    q: 'celular recarga telefono credito' },
  { name: 'Bus',           q: 'sube colectivo transporte tarjeta' },
  { name: 'CreditCard',    q: 'tarjeta pago debito credito' },
  { name: 'Wifi',          q: 'internet wifi conexion' },
  { name: 'Zap',           q: 'energia pila bateria luz' },
  { name: 'BatteryFull',   q: 'pila bateria energia' },
  { name: 'Phone',         q: 'telefono llamada' },

  // Mascotas
  { name: 'Dog',           q: 'perro mascota animal' },
  { name: 'Cat',           q: 'gato mascota animal' },
  { name: 'Bone',          q: 'hueso mascota perro alimento' },
  { name: 'PawPrint',      q: 'mascota animal pet huella' },

  // Librería / varios
  { name: 'Pencil',        q: 'lapiz libreria escolar' },
  { name: 'NotebookPen',   q: 'cuaderno libreria escolar anotador' },
  { name: 'Scissors',      q: 'tijera libreria bazar' },
  { name: 'Flower',        q: 'flor floreria planta' },
  { name: 'Sparkles',      q: 'limpieza brillo varios nuevo' },
  { name: 'Tag',           q: 'etiqueta precio oferta promo' },
  { name: 'Percent',       q: 'descuento oferta promo' },
  { name: 'Star',          q: 'destacado favorito estrella' },
]

/** Normaliza para buscar: minúsculas, sin acentos. */
export function normalizarBusqueda(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Filtra el catálogo por término en español (o por nombre lucide). */
export function buscarIconos(query: string): IconoTienda[] {
  const s = normalizarBusqueda(query)
  if (!s) return ICONOS_TIENDA
  return ICONOS_TIENDA.filter(i => i.q.includes(s) || i.name.toLowerCase().includes(s))
}
