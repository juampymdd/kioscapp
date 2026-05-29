import { NextResponse } from 'next/server'
import { getSession } from '@/src/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  return NextResponse.json({
    userId: session.userId,
    email:  session.email,
    nombre: session.nombre,
  })
}
