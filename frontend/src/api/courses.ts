import { request } from './http'
import type { Certification } from './types'

export interface CourseVideoView {
  id: number
  sectionId: number
  title: string
  durationSeconds: number | null
  watched: boolean
  videoUrl: string // /api/courses/videos/<id>/stream/ (Django checks the enrolment)
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

/** 404 unknown cert, 403 not enrolled (the page redirects to /catalog). */
export async function getCourse(certId: number): Promise<CourseView> {
  return request<CourseView>('GET', `/api/courses/${certId}/`)
}
