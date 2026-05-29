import bcrypt from 'bcryptjs'
import { getDb } from '@/src/db'
import { users } from '@/src/db/schema'
import { eq } from 'drizzle-orm'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function getUserByEmail(email: string) {
  const db = getDb()
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
  return rows[0] ?? null
}
