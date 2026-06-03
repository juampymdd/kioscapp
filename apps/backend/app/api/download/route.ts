import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

const REPO = 'juampymdd/kioscapp'

/**
 * Descarga gateada por login: redirige al instalador (.exe) del último
 * GitHub Release. Así el botón siempre baja la última versión publicada.
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'kioscapp' },
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    return NextResponse.json(
      { error: 'Todavía no hay una versión publicada para descargar.' },
      { status: 404 },
    )
  }

  const release = await res.json() as { assets?: { name: string; browser_download_url: string }[] }
  const asset = release.assets?.find(a => a.name.toLowerCase().endsWith('.exe'))
  if (!asset) {
    return NextResponse.json(
      { error: 'El instalador no está disponible en la última versión.' },
      { status: 404 },
    )
  }

  return NextResponse.redirect(asset.browser_download_url)
}
