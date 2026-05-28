import { create } from 'zustand'
import type { Caja } from '@kioscapp/shared'

interface CajaStore {
  cajaActiva: Caja | null
  setCajaActiva: (caja: Caja | null) => void
}

export const useCajaStore = create<CajaStore>(set => ({
  cajaActiva: null,
  setCajaActiva: caja => set({ cajaActiva: caja }),
}))
