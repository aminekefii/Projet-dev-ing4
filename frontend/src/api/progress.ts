import { db, save } from './db'
import { ApiError } from './errors'
import { findEnrolment, isWatched, recomputeProgress } from './queries'
import { delay, nowIso, requireRole } from './util'

export interface MarkWatchedResult { progress: number; section: { id: number; total: number; watched: number } }

export async function markWatched(videoId: number): Promise<MarkWatchedResult> {
  await delay()
  const user = requireRole('student')
  const t = db().tables
  const video = t.courseVideos.find(v => v.id === videoId)
  if (!video) throw new ApiError(404, 'video_not_found')
  const section = t.courseSections.find(s => s.id === video.sectionId)!
  if (!findEnrolment(user.id, section.certificationId)) throw new ApiError(403, 'not_enrolled')
  if (!isWatched(user.id, videoId)) t.videoProgress.push({ userId: user.id, videoId, watchedAt: nowIso() })
  const progress = recomputeProgress(user.id, section.certificationId)
  save()
  const sectionVideos = t.courseVideos.filter(v => v.sectionId === section.id)
  return {
    progress,
    section: { id: section.id, total: sectionVideos.length, watched: sectionVideos.filter(v => isWatched(user.id, v.id)).length },
  }
}
