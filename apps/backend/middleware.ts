import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  // Quick check — full session validation is done in the dashboard layout
  const hasSession = req.cookies.has('kioscapp_session')
  if (!hasSession) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
