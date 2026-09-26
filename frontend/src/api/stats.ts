import { db } from './db'
import { delay, requireRole } from './util'

export interface StudentDashboard { displayName: string; email: string; earned: number; inProgress: number; examReady: number }

export async function dashboard(): Promise<StudentDashboard> {
  await delay()
  const u = requireRole('student')
  const mine = db().tables.userCertifications.filter(uc => uc.userId === u.id)
  return {
    displayName: u.firstname || u.email.split('@')[0] || u.email,
    email: u.email,
    earned: mine.filter(uc => uc.status === 'earned').length,
    inProgress: mine.filter(uc => uc.status === 'in_progress').length,
    examReady: mine.filter(uc => uc.progress >= 100).length,
  }
}

export interface AdminDashboard { pendingVouchers: number; students: number; enrolments: number; unreadMessages: number }

export async function adminDashboard(): Promise<AdminDashboard> {
  await delay()
  requireRole('admin')
  const t = db().tables
  return {
    pendingVouchers: t.voucherRequests.filter(v => v.status === 'pending').length,
    students: t.users.filter(u => u.role === 'student').length,
    enrolments: t.userCertifications.length,
    unreadMessages: t.contactMessages.filter(m => m.status === 'unread').length,
  }
}

export interface TopCert { code: string; name: string; provider: string; count: number; barPct: number }
export interface AdminStats {
  students: number
  catalogSize: number
  enrolments: number
  inProgress: number
  earned: number
  examReady: number
  vouchers: number
  pendingVouchers: number
  top: TopCert[]
}

export async function adminStats(): Promise<AdminStats> {
  await delay()
  requireRole('admin')
  const t = db().tables
  const counted = t.certifications
    .map(c => ({ code: c.code, name: c.name, provider: c.provider, count: t.userCertifications.filter(uc => uc.certificationId === c.id).length }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
    .slice(0, 5)
  const max = Math.max(1, counted[0]?.count ?? 0)
  return {
    students: t.users.filter(u => u.role === 'student').length,
    catalogSize: t.certifications.length,
    enrolments: t.userCertifications.length,
    inProgress: t.userCertifications.filter(uc => uc.status === 'in_progress').length,
    earned: t.userCertifications.filter(uc => uc.status === 'earned').length,
    examReady: t.userCertifications.filter(uc => uc.progress >= 100).length,
    vouchers: t.voucherRequests.length,
    pendingVouchers: t.voucherRequests.filter(v => v.status === 'pending').length,
    top: counted.map(c => ({ ...c, barPct: Math.round((100 * c.count) / max) })),
  }
}
