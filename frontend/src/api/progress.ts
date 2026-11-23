import { refreshMirror } from './certifications'
import { request } from './http'

export interface MarkWatchedResult { progress: number; section: { id: number; total: number; watched: number } }

/** Django checks the 90 % rule itself from the playback position (seconds). */
export async function markWatched(videoId: number, position: number, duration: number): Promise<MarkWatchedResult> {
  const result = await request<MarkWatchedResult>('POST', `/api/courses/videos/${videoId}/watched/`, { position, duration })
  void refreshMirror()
  return result
}
