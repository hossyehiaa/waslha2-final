// Auth helpers - shared between server actions and API routes
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from './db'

export const SALT_ROUNDS = 12
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
export const SESSION_COOKIE = 'wsalhali_session'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateTrackingNumber(): string {
  const prefix = 'WSL'
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6)
  const random = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export function generateReference(prefix: string = 'REF'): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6)
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `${prefix}-${timestamp}${random}`
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/[<>]/g, '')
}

export function isValidPhone(phone: string): boolean {
  return /^[\d\s\+\-\(\)]{7,20}$/.test(phone)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function createSession(userId: string, ip?: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress: ip,
    },
  })

  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  })

  return token
}

export async function setSessionCookie(token: string) {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  })
}

export async function clearSessionCookie() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  cookieStore.delete(SESSION_COOKIE)
}

export type AuthUser = {
  id: string
  username: string
  email: string | null
  fullName: string
  phone: string | null
  role: 'ADMIN' | 'EMPLOYEE' | 'DRIVER' | 'CLIENT'
  status: string
  avatar: string | null
  clientId?: string | null
  driverId?: string | null
  employeeId?: string | null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }

    const user = session.user
    if (user.status !== 'ACTIVE') return null

    const client = user.role === 'CLIENT' ? await db.client.findUnique({ where: { userId: user.id } }) : null
    const driver = user.role === 'DRIVER' ? await db.driver.findUnique({ where: { userId: user.id } }) : null
    const employee = user.role === 'EMPLOYEE' ? await db.employee.findUnique({ where: { userId: user.id } }) : null

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role as AuthUser['role'],
      status: user.status,
      avatar: user.avatar,
      clientId: client?.id ?? null,
      driverId: driver?.id ?? null,
      employeeId: employee?.id ?? null,
    }
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') throw new Error('FORBIDDEN')
  return user
}

export async function requireAdminOnly(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN')
  return user
}

export async function requireClient(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== 'CLIENT' && user.role !== 'ADMIN') throw new Error('FORBIDDEN')
  return user
}
