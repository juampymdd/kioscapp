import type { SyncFields } from './sync'

export type EstadoCaja = 'abierta' | 'cerrada'

export type TipoMovimiento =
  | 'venta_efectivo'
  | 'venta_debito'
  | 'venta_credito'
  | 'venta_qr'
  | 'ingreso_manual'
  | 'egreso_manual'
  | 'apertura'
  | 'cierre'

/** Caja = un turno laboral. Una caja abierta = turno activo. */
export interface Caja extends SyncFields {
  usuario_id: string | null
  apertura_at: string        // ISO8601 UTC
  cierre_at: string | null   // null mientras está abierta
  monto_apertura_centavos: number
  monto_cierre_centavos: number | null
  estado: EstadoCaja
}

/** Cada movimiento de dinero en el turno queda registrado aquí. */
export interface MovimientoCaja extends SyncFields {
  caja_id: string
  tipo: TipoMovimiento
  /** Positivo = entrada de dinero. Negativo = salida. */
  monto_centavos: number
  descripcion: string
}
