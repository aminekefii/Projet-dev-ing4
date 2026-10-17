import { verifyPassword } from './auth'
import { db, nextId, save } from './db'
import { ApiError } from './errors'
import { featuredIds, findCert, findEnrolment, orderedCertifications } from './queries'
import type { Category, Certification, EnrolmentStatus } from './types'
import { delay, nowIso, requireRole } from './util'

export interface Flash { type: 'success' | 'error' | 'info'; message: string }

export interface CatalogItem extends Certification { enrolled: boolean; featured: boolean }
export interface CatalogGroup { category: Category; label: string; items: CatalogItem[] }

const GROUP_LABELS: Record<Category, string> = {
  technical: 'Technical Certifications',
  linguistic: 'Linguistic Certifications',
  other: 'Other Certifications',
}

export async function listCatalog(): Promise<CatalogGroup[]> {
  await delay()
  const user = requireRole('student')
  const featured = featuredIds()
  const enrolled = new Set(db().tables.userCertifications.filter(uc => uc.userId === user.id).map(uc => uc.certificationId))
  const groups: CatalogGroup[] = (['technical', 'linguistic', 'other'] as Category[]).map(category => ({
    category, label: GROUP_LABELS[category], items: [],
  }))
  for (const c of orderedCertifications()) {
    groups.find(g => g.category === c.category)!.items.push({ ...c, enrolled: enrolled.has(c.id), featured: featured.includes(c.id) })
  }
  return groups.filter(g => g.items.length > 0)
}

/** INV §catalog POST, validation order preserved. Errors are thrown as ApiError(400). */
export async function enroll(certId: number, password: string): Promise<Flash> {
  await delay()
  const user = requireRole('student')
  if (!featuredIds().includes(certId)) throw new ApiError(400, 'That certification is not currently open for enrolment.')
  if (password === '') throw new ApiError(400, 'Please enter your password to confirm the enrolment.')
  if (!(await verifyPassword(password))) throw new ApiError(400, 'Wrong password. Enrolment cancelled.')
  if (!findCert(certId)) throw new ApiError(400, 'That certification could not be found.')
  if (findEnrolment(user.id, certId)) return { type: 'info', message: 'You are already enrolled in that certification.' }
  db().tables.userCertifications.push({
    id: nextId('userCertifications'), userId: user.id, certificationId: certId,
    status: 'in_progress', progress: 0, enrolledAt: nowIso(), earnedAt: null,
  })
  save()
  return { type: 'success', message: 'Enrolled successfully. The certification is now in progress on your dashboard.' }
}

export type MyFilter = 'all' | 'earned' | 'in_progress'

export interface MyCertification {
  certification: Certification
  status: EnrolmentStatus
  progress: number
  enrolledAt: string
  earnedAt: string | null
}

export interface MyCertificationsView {
  items: MyCertification[] // already filtered
  total: number // unfiltered count (drives the empty state)
  earned: number
  inProgress: number
  catalogSize: number
  available: number
}

export async function listMine(filter: MyFilter): Promise<MyCertificationsView> {
  await delay()
  const user = requireRole('student')
  const { userCertifications, certifications } = db().tables
  const all: MyCertification[] = userCertifications
    .filter(uc => uc.userId === user.id)
    .sort((a, b) => (a.status === b.status ? b.enrolledAt.localeCompare(a.enrolledAt) : a.status === 'earned' ? -1 : 1))
    .map(uc => ({
      certification: findCert(uc.certificationId)!,
      status: uc.status, progress: uc.progress, enrolledAt: uc.enrolledAt, earnedAt: uc.earnedAt,
    }))
  const earned = all.filter(c => c.status === 'earned').length
  return {
    items: filter === 'all' ? all : all.filter(c => c.status === filter),
    total: all.length,
    earned,
    inProgress: all.length - earned,
    catalogSize: certifications.length,
    available: Math.max(0, certifications.length - all.length),
  }
}

/** Only in-progress enrolments can be cancelled; watched videos and vouchers stay (as v1). */
export async function cancel(certId: number): Promise<Flash> {
  await delay()
  const user = requireRole('student')
  const t = db().tables
  const index = t.userCertifications.findIndex(uc => uc.userId === user.id && uc.certificationId === certId && uc.status === 'in_progress')
  if (index === -1) throw new ApiError(400, 'That enrolment could not be cancelled.')
  t.userCertifications.splice(index, 1)
  save()
  return { type: 'success', message: 'Enrolment cancelled.' }
}
