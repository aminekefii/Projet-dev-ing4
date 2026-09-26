import { db } from './db'
import { ApiError } from './errors'
import type { PublicUser, Role, User } from './types'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const delay = (ms = 150): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
export const nowIso = (): string => new Date().toISOString()

export function toPublic(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = u
  return rest
}

export function sessionUser(): User | null {
  const s = db()
  return s.tables.users.find(u => u.id === s.sessionUserId) ?? null
}

export function requireUser(): User {
  const u = sessionUser()
  if (!u) throw new ApiError(401, 'Please sign in to continue.')
  return u
}

export function requireRole(role: Role): User {
  const u = requireUser()
  if (u.role !== role) throw new ApiError(403, 'You do not have access to this page.')
  return u
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ApiError(400, 'Upload failed. Please try again.'))
    reader.readAsDataURL(file)
  })
}
