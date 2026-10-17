import { db, nextId, save } from './db'
import { ApiError, isApiError } from './errors'
import { request } from './http'
import type { PublicUser } from './types'

// Sign up, sign in and sign out go to Django (/api/auth/). The rest of the app
// still runs on the mock store, so each signed-in Django user is linked to a
// mock user with the same email (demo data stays attached to the demo accounts).

export interface SignupForm { firstname: string; lastname: string; email: string; password: string }

export const MIN_PASSWORD = 8

function linkMockSession(user: PublicUser): void {
  const s = db()
  const users = s.tables.users
  let mock = users.find(u => u.email.toLowerCase() === user.email.toLowerCase())
  if (!mock) {
    // Password stays empty: Django checks passwords (see verifyPassword).
    mock = { id: nextId('users'), email: user.email, password: '', firstname: user.firstname, lastname: user.lastname, role: user.role, createdAt: user.createdAt }
    users.push(mock)
  }
  Object.assign(mock, { firstname: user.firstname, lastname: user.lastname, role: user.role })
  s.sessionUserId = mock.id
  try {
    save()
  } catch {
    // Storage full: the link is rebuilt from Django on the next page load anyway.
  }
}

function unlinkMockSession(): void {
  db().sessionUserId = null
  try {
    save()
  } catch {
    // Storage full: the rollback restored the session, so clear it again in memory.
    db().sessionUserId = null
  }
}

export async function login(email: string, password: string): Promise<PublicUser> {
  if (email.trim() === '' || password === '') throw new ApiError(400, 'Please enter both email and password.')
  const user = await request<PublicUser>('POST', '/api/auth/login/', { email: email.trim(), password })
  linkMockSession(user)
  return user
}

/** Creates a student account in Django and signs it in. */
export async function register(form: SignupForm): Promise<PublicUser> {
  const user = await request<PublicUser>('POST', '/api/auth/register/', {
    firstname: form.firstname.trim(), lastname: form.lastname.trim(), email: form.email.trim(), password: form.password,
  })
  linkMockSession(user)
  return user
}

export async function logout(): Promise<void> {
  // Signing out must always work locally, even if the server can't be reached.
  unlinkMockSession()
  try {
    await request('POST', '/api/auth/logout/')
  } catch {
    // Best effort: the local session is already gone.
  }
}

/** The signed-in user, or null when nobody is signed in. */
export async function currentUser(): Promise<PublicUser | null> {
  try {
    const user = await request<PublicUser>('GET', '/api/auth/me/')
    linkMockSession(user)
    return user
  } catch (e) {
    unlinkMockSession()
    if (isApiError(e, 401) || isApiError(e, 403)) return null
    throw e
  }
}

/** Re-checks the signed-in user's password (enrolment and voucher approval ask for it). */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    await request('POST', '/api/auth/verify-password/', { password })
    return true
  } catch (e) {
    if (isApiError(e, 400)) return false
    throw e
  }
}
