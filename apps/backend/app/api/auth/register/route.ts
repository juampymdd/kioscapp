import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/src/db'
import { users } from '@/src/db/schema'
import { hashPassword, getUserByEmail } from '@/src/lib/auth'
import { getSession } from '@/src/lib/session'

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; nombre?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { email, password, nombre } = body
  if (!email || !password || !nombre) {
    return NextResponse.json({ error: 'email, password y nombre son requeridos' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const existing = await getUserByEmail(email)
  if (existing) {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 })
  }

  const db = getDb()
  const id = crypto.randomUUID()
  const ts = new Date().toISOString()
  await db.insert(users).values({
    id,
    email: email.toLowerCase(),
    password_hash: await hashPassword(password),
    nombre,
    created_at: ts,
  })

  const session = await getSession()
  session.userId = id
  session.email  = email.toLowerCase()
  session.nombre = nombre
  await session.save()

  return NextResponse.json({ ok: true })
}
