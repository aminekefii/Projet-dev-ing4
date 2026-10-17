import { db, nextId, save } from './db'
import { ApiError } from './errors'
import type { PublicUser } from './types'
import { delay, EMAIL_RE, nowIso, sessionUser, toPublic } from './util'

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

export interface SignupForm { firstname: string; lastname: string; email: string; password: string }

export const MIN_PASSWORD = 8

/** Creates a student account and signs it in. Admins are never created here. */
export async function register(form: SignupForm): Promise<PublicUser> {
  await delay()
  const firstname = form.firstname.trim()
  const lastname = form.lastname.trim()
  const email = form.email.trim()
  if (!firstname || !lastname || !email || !form.password) throw new ApiError(400, 'Please fill in all fields.')
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Please enter a valid email address.')
  if (form.password.length < MIN_PASSWORD) throw new ApiError(400, `Password must be at least ${MIN_PASSWORD} characters.`)
  const s = db()
  if (s.tables.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new ApiError(409, 'An account with this email already exists.')
  }
  const user = {
    id: nextId('users'), email: email.slice(0, 255), password: form.password,
    firstname: firstname.slice(0, 100), lastname: lastname.slice(0, 100), role: 'student' as const, createdAt: nowIso(),
  }
  s.tables.users.push(user)
  s.sessionUserId = user.id
  save()
  return toPublic(user)
}

export async function logout(): Promise<void> {
  await delay()
  db().sessionUserId = null
  try {
    save()
  } catch {
    // Storage full: the rollback restored the session, so clear it again in memory.
    // Signing out must always work.
    db().sessionUserId = null
  }
}

export async function currentUser(): Promise<PublicUser | null> {
  await delay(0)
  const u = sessionUser()
  return u ? toPublic(u) : null
}
