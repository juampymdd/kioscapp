import { useEffect, useState } from 'react'
import { useCajaStore } from './store/cajaStore'
import { getDataStore } from './store/dataStore'
import AbrirCaja from './screens/AbrirCaja'
import POSScreen from './screens/POSScreen'

export default function App() {
  const { cajaActiva, setCajaActiva } = useCajaStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDataStore()
      .getCajaActiva()
      .then(caja => setCajaActiva(caja))
      .finally(() => setLoading(false))
  }, [setCajaActiva])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-lg animate-pulse">Iniciando KioscApp…</div>
      </div>
    )
  }

  if (!cajaActiva) return <AbrirCaja />
  return <POSScreen />
}
