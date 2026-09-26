import { db } from './db'
import type { Category, Certification, CourseVideo, UserCertification } from './types'

const CATEGORY_ORDER: Record<Category, number> = { technical: 0, linguistic: 1, other: 2 }
const pin = (code: string): number => (code === 'PCEP' ? 0 : code === 'PCAP' ? 1 : 2)
const cmp = (a: string, b: string): number => a.localeCompare(b, 'en', { sensitivity: 'base' })

/** INV §0 "Featured / enrollable certs" ordering (MySQL ENUM order, PCEP/PCAP pinned). */
export function orderedCertifications(): Certification[] {
  return [...db().tables.certifications].sort((a, b) =>
    CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || pin(a.code) - pin(b.code) || cmp(a.provider, b.provider) || cmp(a.code, b.code))
}

/** First 3 of the ordered list → PCEP, PCAP, AWS-CLF with seed data. */
export function featuredIds(): number[] {
  return orderedCertifications().slice(0, 3).map(c => c.id)
}

export function findCert(certId: number): Certification | undefined {
  return db().tables.certifications.find(c => c.id === certId)
}

export function findEnrolment(userId: number, certId: number): UserCertification | undefined {
  return db().tables.userCertifications.find(uc => uc.userId === userId && uc.certificationId === certId)
}

export function certVideos(certId: number): CourseVideo[] {
  const { courseSections, courseVideos } = db().tables
  const sections = courseSections.filter(s => s.certificationId === certId).sort((a, b) => a.position - b.position)
  return sections.flatMap(s => courseVideos.filter(v => v.sectionId === s.id).sort((a, b) => a.position - b.position))
}

export function isWatched(userId: number, videoId: number): boolean {
  return db().tables.videoProgress.some(p => p.userId === userId && p.videoId === videoId)
}

/** INV §0: round(100 * watched / total), 0 if no videos. Writes it to the enrolment (caller saves). */
export function recomputeProgress(userId: number, certId: number): number {
  const videos = certVideos(certId)
  const watched = videos.filter(v => isWatched(userId, v.id)).length
  const pct = videos.length === 0 ? 0 : Math.round((100 * watched) / videos.length)
  const enrolment = findEnrolment(userId, certId)
  if (enrolment) enrolment.progress = pct
  return pct
}
