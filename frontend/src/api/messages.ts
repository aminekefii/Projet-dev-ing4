import { db, nextId, save } from './db'
import { ApiError } from './errors'
import type { ContactMessage, MessageStatus } from './types'
import { delay, EMAIL_RE, nowIso, requireRole, sessionUser } from './util'

export interface ContactForm { name: string; surname: string; email: string; message: string }

/** A logged-in student's identity comes from the session; posted values are ignored (as v1). */
export async function send(form: ContactForm): Promise<void> {
  await delay()
  const u = sessionUser()
  const student = u?.role === 'student' ? u : null
  const name = (student ? student.firstname ?? '' : form.name).trim()
  const surname = (student ? student.lastname ?? '' : form.surname).trim()
  const email = (student ? student.email : form.email).trim()
  const message = form.message.trim()
  if (!name || !surname || !email || !message) throw new ApiError(400, 'Please fill in all fields.')
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Please enter a valid email address.')
  db().tables.contactMessages.push({
    id: nextId('contactMessages'), name: name.slice(0, 100), surname: surname.slice(0, 100), email: email.slice(0, 255),
    message, status: 'unread', submittedAt: nowIso(),
  })
  save()
}

export type MessageFilter = 'all' | MessageStatus
export interface MessageList { rows: ContactMessage[]; counts: Record<MessageFilter, number> }

export async function list(filter: MessageFilter): Promise<MessageList> {
  await delay()
  requireRole('admin')
  const rows = [...db().tables.contactMessages].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const unread = rows.filter(m => m.status === 'unread').length
  return {
    rows: filter === 'all' ? rows : rows.filter(m => m.status === filter),
    counts: { all: rows.length, unread, read: rows.length - unread },
  }
}

/** Opening a message marks it read (as v1). 404 → page redirects to the list. */
export async function get(id: number): Promise<ContactMessage> {
  await delay()
  requireRole('admin')
  const m = db().tables.contactMessages.find(x => x.id === id)
  if (!m) throw new ApiError(404, 'Message not found.')
  if (m.status === 'unread') {
    m.status = 'read'
    save()
  }
  return { ...m }
}

export async function remove(id: number): Promise<void> {
  await delay()
  requireRole('admin')
  const t = db().tables
  t.contactMessages = t.contactMessages.filter(m => m.id !== id)
  save()
}

export async function markUnread(id: number): Promise<void> {
  await delay()
  requireRole('admin')
  const m = db().tables.contactMessages.find(x => x.id === id)
  if (m) {
    m.status = 'unread'
    save()
  }
}
