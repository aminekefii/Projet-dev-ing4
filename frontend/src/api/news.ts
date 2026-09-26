import { db, nextId, save } from './db'
import { ApiError } from './errors'
import type { NewsImage } from './types'
import { delay, nowIso, readFileAsDataUrl, requireRole } from './util'

export const MAX_UPLOAD_BYTES = 1024 * 1024
const NEWS_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

/** Public. Newest first. */
export async function list(): Promise<NewsImage[]> {
  await delay()
  return [...db().tables.news].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

export async function upload(file: File): Promise<string> {
  await delay()
  requireRole('admin')
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(400, 'The file is too large (max 1 MB).')
  const ext = NEWS_TYPES[file.type]
  if (!ext) throw new ApiError(400, 'Unsupported format. Use JPG, PNG, WEBP or GIF.')
  const url = await readFileAsDataUrl(file)
  const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  db().tables.news.push({ id: nextId('news'), name: `news_${Math.floor(Date.now() / 1000)}_${hex}.${ext}`, url, sizeBytes: file.size, uploadedAt: nowIso() })
  save() // throws ApiError(507) and rolls back when storage is full
  return "Image uploaded — it's now live on the homepage."
}

export async function remove(id: number): Promise<string> {
  await delay()
  requireRole('admin')
  const t = db().tables
  if (!t.news.some(n => n.id === id)) throw new ApiError(404, 'File not found.')
  t.news = t.news.filter(n => n.id !== id)
  save()
  return 'Image removed.'
}
