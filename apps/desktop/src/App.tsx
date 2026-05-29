import { useEffect, useState } from 'react'
import { useCajaStore } from './store/cajaStore'
import { getDataStore } from './store/dataStore'
import AbrirCaja from './screens/AbrirCaja'
import POSScreen from './screens/POSScreen'
import ProductosScreen from './screens/ProductosScreen'
import StockScreen from './screens/StockScreen'
import ProveedoresScreen from './screens/ProveedoresScreen'
import ReportesScreen from './screens/ReportesScreen'
import Sidebar, { type ScreenId } from './components/Sidebar'
import CerrarCaja from './screens/CerrarCaja'
import StockAlerts from './components/StockAlerts'
import SyncIndicator from './components/SyncIndicator'

export default function App() {
  const { cajaActiva, setCajaActiva } = useCajaStore()
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState<ScreenId>('pos')
  const [showCerrarCaja, setShowCerrarCaja] = useState(false)

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

  return (
    <div className="flex h-full bg-slate-950">
      <Sidebar
        currentScreen={screen}
        onNavigate={setScreen}
        cajaActiva={cajaActiva}
        onCerrarCaja={() => setShowCerrarCaja(true)}
      />

      {/* Top bar con StockAlerts */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900
                        border-b border-slate-800 shrink-0">
          <SyncIndicator />
          <StockAlerts />
        </div>

        <main className="flex-1 min-h-0 overflow-hidden">
          {screen === 'pos'         && <POSScreen />}
          {screen === 'productos'   && <ProductosScreen />}
          {screen === 'stock'       && <StockScreen />}
          {screen === 'proveedores' && <ProveedoresScreen />}
          {screen === 'reportes'    && <ReportesScreen />}
        </main>
      </div>

      {showCerrarCaja && (
        <CerrarCaja onCancelar={() => setShowCerrarCaja(false)} />
      )}
    </div>
  )
}
