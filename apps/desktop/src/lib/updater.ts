import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

/**
 * Auto-update silenciosa. Al iniciar revisa si hay versión nueva; si la hay,
 * la descarga, instala y reinicia la app. Corre antes de abrir caja para no
 * interrumpir una venta.
 *
 * En dev, sin internet o sin release publicado, check() falla → se ignora y la
 * app sigue normal. onUpdating() se dispara solo cuando arranca una instalación
 * real (para mostrar el overlay "Actualizando…").
 */
export async function runUpdater(onUpdating: () => void): Promise<void> {
  try {
    const update = await check()
    if (update) {
      onUpdating()
      await update.downloadAndInstall()
      await relaunch()
    }
  } catch {
    // sin updater (dev) / sin internet / endpoint no disponible: continuar
  }
}
