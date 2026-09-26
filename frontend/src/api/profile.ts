import { studentId } from '../lib/format'
import { db, save } from './db'
import { ApiError } from './errors'
import type { Profile, PublicUser } from './types'
import { delay, nowIso, readFileAsDataUrl, requireRole, toPublic } from './util'
import { MAX_UPLOAD_BYTES } from './news'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface ProfileView {
  user: PublicUser
  studentId: string
  phone: string
  address: string
  photo: string | null
  earnedCount: number
  memberSince: number
}

function profileRow(userId: number): Profile {
  const t = db().tables
  let p = t.profiles.find(x => x.userId === userId)
  if (!p) {
    p = { userId, phone: null, address: null, photo: null, updatedAt: nowIso() }
    t.profiles.push(p)
  }
  return p
}

export async function get(): Promise<ProfileView> {
  await delay()
  const u = requireRole('student')
  const p = db().tables.profiles.find(x => x.userId === u.id)
  return {
    user: toPublic(u),
    studentId: studentId(u.id),
    phone: p?.phone ?? '',
    address: p?.address ?? '',
    photo: p?.photo ?? null,
    earnedCount: db().tables.userCertifications.filter(uc => uc.userId === u.id && uc.status === 'earned').length,
    memberSince: new Date(u.createdAt).getFullYear(),
  }
}

export async function update(fields: { phone: string; address: string }): Promise<string> {
  await delay()
  const u = requireRole('student')
  const p = profileRow(u.id)
  p.phone = fields.phone.trim() || null
  p.address = fields.address.trim() || null
  p.updatedAt = nowIso()
  save()
  return 'Profile saved.'
}

export async function updatePhoto(file: File): Promise<string> {
  await delay()
  const u = requireRole('student')
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(400, 'The file is too large (max 1 MB).')
  if (!PHOTO_TYPES.includes(file.type)) throw new ApiError(400, 'Unsupported format. Use JPG, PNG or WEBP.')
  const p = profileRow(u.id)
  p.photo = await readFileAsDataUrl(file)
  p.updatedAt = nowIso()
  save()
  return 'Photo updated.'
}
