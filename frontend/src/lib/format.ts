const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const pad2 = (n: number): string => String(n).padStart(2, '0')

function parts(iso: string) {
  const d = new Date(iso)
  return { day: pad2(d.getDate()), mon: MONTHS[d.getMonth()], year: d.getFullYear(), time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` }
}
/** PHP `d M Y` → 26 Sep 2026 */
export function formatDate(iso: string): string {
  const p = parts(iso)
  return `${p.day} ${p.mon} ${p.year}`
}
/** PHP `d M Y, H:i` → 26 Sep 2026, 14:05 */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${parts(iso).time}`
}
/** PHP `d M Y \a\t H:i` → 26 Sep 2026 at 14:05 */
export function formatDateAt(iso: string): string {
  return `${formatDate(iso)} at ${parts(iso).time}`
}
/** intended v1 admin-news format → 26 Sep 2026 · 14:05 */
export function formatDateDot(iso: string): string {
  return `${formatDate(iso)} · ${parts(iso).time}`
}
/** TU-00001 */
export const studentId = (id: number): string => `TU-${String(id).padStart(5, '0')}`
/** v1 rule: plural "s" omitted only when n === 1 */
export const plural = (n: number): string => (n === 1 ? '' : 's')
/** "Name Surname" of a contact message sender. */
export const senderName = (m: { name: string; surname: string }): string => `${m.name} ${m.surname}`.trim()
