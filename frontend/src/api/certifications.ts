import { db, save } from './db'
import { request } from './http'
import type { Category, Certification, EnrolmentStatus } from './types'
import { sessionUser } from './util'

// Catalogue, inscription, "mes certifications" et annulation : tout vient de Django
// (/api/certifications/). Les pages des autres (tableau de bord, vouchers, test blanc,
// profil) lisent encore le mock : mirror() y recopie les inscriptions Django pour
// qu'elles restent cohérentes, jusqu'à ce qu'elles passent elles aussi sur Django.

export interface Flash { type: 'success' | 'error' | 'info'; message: string }

export interface CatalogItem extends Certification { enrolled: boolean; featured: boolean }
export interface CatalogGroup { category: Category; label: string; items: CatalogItem[] }

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

export async function listCatalog(): Promise<CatalogGroup[]> {
  return request<CatalogGroup[]>('GET', '/api/certifications/catalog/')
}

/** Errors (closed certification, wrong password…) come back as ApiError(400). */
export async function enroll(certId: number, password: string): Promise<Flash> {
  const flash = await request<Flash>('POST', `/api/certifications/${certId}/enroll/`, { password })
  await refreshMirror()
  return flash
}

export async function listMine(filter: MyFilter): Promise<MyCertificationsView> {
  const view = await request<MyCertificationsView>('GET', `/api/certifications/mine/?filter=${filter}`)
  if (filter === 'all') mirror(view.items)
  return view
}

/** Only in-progress enrolments can be cancelled. */
export async function cancel(certId: number): Promise<Flash> {
  const flash = await request<Flash>('POST', `/api/certifications/${certId}/cancel/`)
  await refreshMirror()
  return flash
}

/** Copies the signed-in user's Django enrolments into the mock store (matched by certification code). */
function mirror(items: MyCertification[]): void {
  const user = sessionUser()
  if (!user) return
  const t = db().tables
  let nextId = Math.max(0, ...t.userCertifications.map(uc => uc.id))
  const mine = items.flatMap(item => {
    const mockCert = t.certifications.find(c => c.code === item.certification.code)
    if (!mockCert) return []
    return [{
      id: ++nextId, userId: user.id, certificationId: mockCert.id,
      status: item.status, progress: item.progress, enrolledAt: item.enrolledAt, earnedAt: item.earnedAt,
    }]
  })
  t.userCertifications = [...t.userCertifications.filter(uc => uc.userId !== user.id), ...mine]
  try {
    save()
  } catch {
    // Storage full: the copy is rebuilt from Django next time.
  }
}

/** Best effort: re-reads the enrolments from Django and mirrors them. */
export async function refreshMirror(): Promise<void> {
  try {
    await listMine('all')
  } catch {
    // The mock copy is only a convenience for the other pages.
  }
}
