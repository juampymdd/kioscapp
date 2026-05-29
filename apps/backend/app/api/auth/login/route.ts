import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, getUserByEmail } from '@/src/lib/auth'
import { getSession } from '@/src/lib/session'

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'email y password son requeridos' }, { status: 400 })
  }

  const user = await getUserByEmail(email)
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const session = await getSession()
  session.userId = user.id
  session.email  = user.email
  session.nombre = user.nombre
  await session.save()

  return NextResponse.json({ ok: true })
}
