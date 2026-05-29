import { useEffect, useState } from 'react'
import { useCajaStore } from './store/cajaStore'
import { getDataStore } from './store/dataStore'
import AbrirCaja from './screens/AbrirCaja'
import SetupScreen from './screens/SetupScreen'
import POSScreen from './screens/POSScreen'
import ProductosScreen from './screens/ProductosScreen'
import StockScreen from './screens/StockScreen'
import ProveedoresScreen from './screens/ProveedoresScreen'
import ReportesScreen from './screens/ReportesScreen'
import Sidebar, { type ScreenId } from './components/Sidebar'
import CerrarCaja from './screens/CerrarCaja'
import ConfigScreen from './screens/ConfigScreen'
import StockAlerts from './components/StockAlerts'
import SyncIndicator from './components/SyncIndicator'

export default function App() {
  const { cajaActiva, setCajaActiva } = useCajaStore()
  const [loading,    setLoading]    = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [screen,     setScreen]     = useState<ScreenId>('pos')
  const [showCerrarCaja, setShowCerrarCaja] = useState(false)
  const [showConfig,     setShowConfig]     = useState(false)

  useEffect(() => {
    const store = getDataStore()
    store.getConfig('local_id').then(async localId => {
      if (!localId) {
        setNeedsSetup(true)
        setLoading(false)
        return
      }
      const caja = await store.getCajaActiva()
      setCajaActiva(caja)
      setLoading(false)
    })
  }, [setCajaActiva])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-lg animate-pulse">Iniciando KioscApp…</div>
      </div>
    )
  }

  if (needsSetup) {
    return (
      <SetupScreen onComplete={async () => {
        setNeedsSetup(false)
        const caja = await getDataStore().getCajaActiva()
        setCajaActiva(caja)
      }} />
    )
  }

  if (!cajaActiva) return (
    <>
      <AbrirCaja />
      {showConfig && <ConfigScreen onClose={() => setShowConfig(false)} />}
      <button
        onClick={() => setShowConfig(true)}
        title="Configuración"
        className="fixed bottom-4 right-4 w-9 h-9 flex items-center justify-center
                   bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white
                   rounded-full transition-colors z-40"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </>
  )

  return (
    <div className="flex h-full bg-slate-950">
      <Sidebar
        currentScreen={screen}
        onNavigate={setScreen}
        cajaActiva={cajaActiva}
        onCerrarCaja={() => setShowCerrarCaja(true)}
        onConfig={() => setShowConfig(true)}
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
      {showConfig && (
        <ConfigScreen onClose={() => setShowConfig(false)} />
      )}
    </div>
  )
}
