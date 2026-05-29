import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { SqliteDataStore } from './store/SqliteDataStore'
import { setDataStore } from './store/dataStore'
import { seedIfEmpty } from './lib/seeder'
import { syncService } from './services/syncService'

async function bootstrap() {
  const localId = import.meta.env.VITE_LOCAL_ID ?? 'local-demo'
  const store = new SqliteDataStore(localId)
  await store.init()
  setDataStore(store)
  await seedIfEmpty(store)
  syncService.start()
}

bootstrap()
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
  .catch(err => {
    document.body.innerHTML = `
      <div style="color:red;padding:2rem;font-family:monospace">
        <h2>Error al inicializar la base de datos</h2>
        <pre>${String(err)}</pre>
      </div>
    `
  })
