import { db, save } from './db'
import { ApiError } from './errors'
import type { PublicUser } from './types'
import { delay, EMAIL_RE, sessionUser, toPublic } from './util'

export async function login(email: string, password: string): Promise<PublicUser> {
  await delay()
  const e = email.trim()
  if (e === '' || password === '') throw new ApiError(400, 'Please enter both email and password.')
  if (!EMAIL_RE.test(e)) throw new ApiError(400, 'Please enter a valid email address.')
  const s = db()
  const user = s.tables.users.find(u => u.email.toLowerCase() === e.toLowerCase())
  if (!user || user.password !== password) throw new ApiError(401, 'Invalid email or password.')
  s.sessionUserId = user.id
  save()
  return toPublic(user)
}

export async function logout(): Promise<void> {
  await delay()
  db().sessionUserId = null
  save()
}

export async function currentUser(): Promise<PublicUser | null> {
  await delay(0)
  const u = sessionUser()
  return u ? toPublic(u) : null
}
