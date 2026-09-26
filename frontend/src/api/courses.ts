import { db } from './db'
import { ApiError } from './errors'
import { certVideos, findCert, findEnrolment, isWatched } from './queries'
import type { Certification } from './types'
import { delay, requireRole } from './util'

export interface CourseVideoView {
  id: number
  sectionId: number
  title: string
  durationSeconds: number | null
  watched: boolean
  videoUrl: string
  subtitleUrl: string | null
}
export interface CourseSectionView { id: number; position: number; title: string; total: number; watched: number; videos: CourseVideoView[] }
export interface CourseView {
  certification: Certification
  progress: number
  hasContent: boolean
  sections: CourseSectionView[]
  initialVideoId: number | null // first unwatched, else the last video
}

/** 404 unknown cert, 403 not enrolled (page redirects to /catalog, as v1). */
export async function getCourse(certId: number): Promise<CourseView> {
  await delay()
  const user = requireRole('student')
  const cert = findCert(certId)
  if (!cert) throw new ApiError(404, 'Certification not found.')
  const enrolment = findEnrolment(user.id, certId)
  if (!enrolment) throw new ApiError(403, 'You are not enrolled in this certification.')

  const sections = db().tables.courseSections
    .filter(s => s.certificationId === certId)
    .sort((a, b) => a.position - b.position)
    .map(s => {
      const videos = db().tables.courseVideos
        .filter(v => v.sectionId === s.id)
        .sort((a, b) => a.position - b.position)
        .map(v => ({
          id: v.id, sectionId: s.id, title: v.title, durationSeconds: v.durationSeconds,
          watched: isWatched(user.id, v.id),
          videoUrl: `/media/${cert.mediaPath}/${s.folder}/${v.filename}`,
          subtitleUrl: v.subtitleFilename ? `/media/${cert.mediaPath}/${s.folder}/${v.subtitleFilename}` : null,
        }))
      return { id: s.id, position: s.position, title: s.title, total: videos.length, watched: videos.filter(v => v.watched).length, videos }
    })

  const ordered = certVideos(certId)
  const firstUnwatched = ordered.find(v => !isWatched(user.id, v.id))
  return {
    certification: cert,
    progress: enrolment.progress,
    hasContent: Boolean(cert.mediaPath),
    sections,
    initialVideoId: firstUnwatched?.id ?? ordered.at(-1)?.id ?? null,
  }
}
