import { formatDate } from '../lib/format'
import { db, nextId, save } from './db'
import { ApiError } from './errors'
import { findCert, findEnrolment } from './queries'
import type { Certification, VoucherStatus } from './types'
import { delay, nowIso, requireRole } from './util'

export interface ReadyCourse { certification: Certification; progress: number; voucher: VoucherStatus | null }

export async function listReady(): Promise<ReadyCourse[]> {
  await delay()
  const user = requireRole('student')
  const t = db().tables
  return t.userCertifications
    .filter(uc => uc.userId === user.id && uc.progress >= 100)
    .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))
    .map(uc => ({
      certification: findCert(uc.certificationId)!,
      progress: uc.progress,
      voucher: t.voucherRequests.find(v => v.userId === user.id && v.certificationId === uc.certificationId)?.status ?? null,
    }))
}

/** Eligible = progress ≥ 100. New → pending; rejected → pending (v1 bug fixed); pending/approved unchanged. */
export async function request(certId: number): Promise<void> {
  await delay()
  const user = requireRole('student')
  const enrolment = findEnrolment(user.id, certId)
  if (!enrolment || enrolment.progress < 100) return // v1 silently ignores and still shows the flash
  const t = db().tables
  const existing = t.voucherRequests.find(v => v.userId === user.id && v.certificationId === certId)
  if (!existing) {
    t.voucherRequests.push({ id: nextId('voucherRequests'), userId: user.id, certificationId: certId, status: 'pending', requestedAt: nowIso() })
  } else if (existing.status === 'rejected') {
    existing.status = 'pending'
  }
  save()
}

export type VoucherFilter = 'all' | VoucherStatus
export type VoucherAction = 'approve' | 'reject' | 'reset'

export interface AdminVoucherRow {
  id: number
  status: VoucherStatus
  requestedAt: string
  student: { email: string; firstname: string | null; lastname: string | null }
  certification: { code: string; name: string; provider: string }
}
export interface AdminVoucherList { rows: AdminVoucherRow[]; counts: Record<VoucherFilter, number> }

export async function listAll(filter: VoucherFilter): Promise<AdminVoucherList> {
  await delay()
  requireRole('admin')
  const t = db().tables
  const rows: AdminVoucherRow[] = [...t.voucherRequests]
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .map(v => {
      const u = t.users.find(x => x.id === v.userId)!
      const c = findCert(v.certificationId)!
      return {
        id: v.id, status: v.status, requestedAt: v.requestedAt,
        student: { email: u.email, firstname: u.firstname, lastname: u.lastname },
        certification: { code: c.code, name: c.name, provider: c.provider },
      }
    })
  const count = (s: VoucherStatus) => rows.filter(r => r.status === s).length
  return {
    rows: filter === 'all' ? rows : rows.filter(r => r.status === filter),
    counts: { all: rows.length, pending: count('pending'), approved: count('approved'), rejected: count('rejected') },
  }
}

export interface VoucherMailto { href: string; email: string }

function buildMailto(email: string, studentName: string, certName: string): VoucherMailto {
  const expiration = formatDate(new Date(Date.now() + 10 * 86_400_000).toISOString())
  const subject = `Your TEK-UP Voucher — ${certName}`
  const body = [
    `Dear ${studentName},`,
    '',
    'Congratulations on successfully passing the certification requirements.',
    '',
    'Please find below your voucher information for the certificate:',
    '',
    '---',
    '',
    'Voucher Code: [INSERT VOUCHER CODE]',
    `Certificate: ${certName}`,
    `Expiration Date: ${expiration}`,
    '----------------------------------',
    '',
    'You can use this voucher to complete your certification process according to the provided instructions.',
    '',
    'If you have any questions or need assistance, feel free to contact us.',
    '',
    'Best regards,',
    'TEKUP Certified Student Office',
  ].join('\n')
  return { email, href: `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` }
}

/** approve needs the logged-in admin's own password (replaces v1's hard-coded "admin"). */
export async function setStatus(id: number, action: VoucherAction, adminPassword = ''): Promise<{ mailto: VoucherMailto | null }> {
  await delay()
  const admin = requireRole('admin')
  const t = db().tables
  const v = t.voucherRequests.find(x => x.id === id)
  if (!v) throw new ApiError(404, 'Voucher request not found.')
  if (action === 'approve' && adminPassword !== admin.password) {
    throw new ApiError(400, 'Incorrect admin password — the voucher was not approved.')
  }
  v.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending'
  save()
  if (action !== 'approve') return { mailto: null }
  const u = t.users.find(x => x.id === v.userId)!
  const name = [u.firstname, u.lastname].filter(Boolean).join(' ') || u.email
  return { mailto: buildMailto(u.email, name, findCert(v.certificationId)!.name) }
}
