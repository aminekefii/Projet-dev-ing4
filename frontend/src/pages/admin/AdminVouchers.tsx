import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { isApiError, vouchers, type AdminVoucherRow, type VoucherAction, type VoucherFilter, type VoucherMailto } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { Modal } from '../../components/Modal'
import { FeFlash } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDateTime } from '../../lib/format'
import { wow } from '../../lib/wow'

const CHIPS: [VoucherFilter, string][] = [['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']]
const FLASH: Record<string, string> = {
  approve: 'Voucher approved.',
  reject: 'Voucher request declined.',
  reset: 'Status reset to pending.',
  bad_password: 'Incorrect admin password — the voucher was not approved.',
}
const SEAL = { pending: 'fa-hourglass-half', approved: 'fa-trophy', rejected: 'fa-times-circle' }

function toFilter(value: string | null): VoucherFilter {
  return value === 'pending' || value === 'approved' || value === 'rejected' ? value : 'all'
}

const studentName = (r: AdminVoucherRow): string =>
  `${r.student.firstname ?? ''} ${r.student.lastname ?? ''}`.trim() || r.student.email

export default function AdminVouchers() {
  usePageTitle('Voucher Requests — Admin')
  const [params, setParams] = useSearchParams()
  const filter = toFilter(params.get('filter'))
  const flashKey = params.get('flash')
  const { data, error, reload } = useAsync(() => vouchers.listAll(filter), [filter])
  const [approveTarget, setApproveTarget] = useState<AdminVoucherRow | null>(null)
  const [password, setPassword] = useState('')
  // One-shot like v1's session value: shown with the flash that created it.
  const [mailto, setMailto] = useState<{ flash: string; value: VoucherMailto } | null>(null)
  const [actionError, setActionError] = useState('')
  const { busy, run } = useBusy()

  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />

  const act = (id: number, action: VoucherAction, adminPassword?: string) => run(async () => {
    setActionError('')
    try {
      const r = await vouchers.setStatus(id, action, adminPassword)
      setMailto(r.mailto ? { flash: action, value: r.mailto } : null)
      setParams({ flash: action }) // the filter is dropped, as v1
    } catch (err) {
      if (isApiError(err, 400)) setParams({ flash: 'bad_password' })
      else setActionError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setApproveTarget(null)
      setPassword('')
      reload()
    }
  })

  const onApprove = (e: FormEvent) => {
    e.preventDefault()
    if (approveTarget) void act(approveTarget.id, 'approve', password)
  }

  const flashText = flashKey ? FLASH[flashKey] : undefined
  const pendingMailto = mailto && mailto.flash === flashKey ? mailto.value : null
  const flashIsError = flashKey === 'bad_password'

  return (
    <>
      <div className="fe-page section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div {...wow('fadeInDown', '0.8s', undefined, 'fe-head')}>
                <h6>TEK-UP Admin Console</h6>
                <h2>Voucher <em>Requests</em></h2>
                <p>Review and action exam-voucher requests submitted by students. Approving a request notifies the student that their voucher is ready.</p>
              </div>
            </div>
          </div>

          {actionError && (
            <div className="row">
              <div className="col-lg-12">
                <FeFlash error><span className="fe-flash__text">{actionError}</span></FeFlash>
              </div>
            </div>
          )}

          {(flashText || pendingMailto) && (
            <div className="row">
              <div className="col-lg-12">
                <FeFlash error={flashIsError} className={pendingMailto ? 'has-action' : ''}>
                  <span className="fe-flash__text">
                    {flashText}
                    {pendingMailto && (
                      <span className="fe-flash__sub"> Open the voucher email for <strong>{pendingMailto.email}</strong> in your mail client.</span>
                    )}
                  </span>
                  {pendingMailto && (
                    <a className="wt-btn wt-btn--primary fe-flash__action" href={pendingMailto.href}>
                      <span>Compose voucher email</span>
                      <span className="wt-btn-arrow" aria-hidden="true">→</span>
                    </a>
                  )}
                </FeFlash>
              </div>
            </div>
          )}

          <div className="row">
            <div className="col-lg-12">
              <div className="admin-filters">
                {CHIPS.map(([key, label]) => (
                  <Link key={key} className={`admin-chip${filter === key ? ' is-active' : ''}`} to={`/admin/vouchers?filter=${key}`}>
                    {label}
                    <span className="admin-chip-count">{data.counts[key]}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {data.rows.length === 0 ? (
            <div className="row">
              <div className="col-lg-8 offset-lg-2">
                <div className="fe-empty">
                  <div className="fe-empty__icon"><i className="fa fa-inbox" aria-hidden="true"></i></div>
                  <h3>Inbox empty</h3>
                  <p>No voucher requests match this filter. Approved and rejected requests stay here for the audit trail.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="row">
              <div className="col-lg-12">
                <ul className="fe-list">
                  {data.rows.map(r => (
                    <li className="fe-row" key={r.id}>
                      <div className="fe-row__seal" aria-hidden="true">
                        <i className={`fa ${SEAL[r.status]}`}></i>
                      </div>
                      <div className="fe-row__meta">
                        <div className="fe-row__provider">{r.certification.provider} &middot; {r.certification.code}</div>
                        <h4 className="fe-row__title">{r.certification.name}</h4>
                        <p className="fe-row__desc">
                          Requested by <strong>{studentName(r)}</strong>
                          {' '}&lt;{r.student.email}&gt;
                          {' '}&middot; {formatDateTime(r.requestedAt)}
                        </p>
                        <div className="fe-row__tags">
                          {r.status === 'pending' && <span className="fe-tag fe-tag--pending"><i className="fa fa-clock-o" aria-hidden="true"></i> Pending</span>}
                          {r.status === 'approved' && <span className="fe-tag fe-tag--approved"><i className="fa fa-check-circle" aria-hidden="true"></i> Approved</span>}
                          {r.status === 'rejected' && <span className="fe-tag fe-tag--rejected"><i className="fa fa-times-circle" aria-hidden="true"></i> Rejected</span>}
                        </div>
                      </div>
                      <div className="fe-row__action admin-actions">
                        {r.status === 'pending' ? (
                          <>
                            <button type="button" className="wt-btn wt-btn--primary" onClick={() => { setPassword(''); setApproveTarget(r) }}>
                              <span>Approve</span>
                              <span className="wt-btn-arrow" aria-hidden="true">→</span>
                            </button>
                            <button type="button" className="wt-btn wt-btn--ghost" disabled={busy} onClick={() => void act(r.id, 'reject')}>Decline</button>
                          </>
                        ) : (
                          <button type="button" className="wt-btn wt-btn--soft" disabled={busy} onClick={() => void act(r.id, 'reset')}>Reset to pending</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={approveTarget !== null} onClose={() => setApproveTarget(null)} contentClassName="enroll-modal approve-modal" labelledBy="approveVoucherLabel">
        <form onSubmit={onApprove} autoComplete="off">
          <div className="modal-body">
            <div className="enroll-icon approve-icon"><i className="fa fa-key"></i></div>
            <h4 id="approveVoucherLabel">Confirm voucher approval</h4>
            <p>You are about to approve the voucher for
              {' '}<strong id="approveStudentName">{approveTarget ? studentName(approveTarget) : '—'}</strong>
              {' '}on <strong id="approveCertName">{approveTarget?.certification.name ?? '—'}</strong>
              {' '}<span className="approve-cert-code" id="approveCertCode">({approveTarget?.certification.code})</span>.
              {' '}Re-enter your admin password to confirm.</p>

            <div className="approve-pw-wrap">
              <label htmlFor="approveAdminPw" className="approve-pw-label">Admin password</label>
              <input
                type="password"
                name="admin_password"
                id="approveAdminPw"
                className="approve-pw-input"
                placeholder="••••••••"
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="enroll-actions">
              <button type="submit" className="wt-btn wt-btn--primary" disabled={busy}>
                <span>Confirm approval</span>
                <span className="wt-btn-arrow" aria-hidden="true">→</span>
              </button>
              <button type="button" className="cancel-link" onClick={() => setApproveTarget(null)}>Cancel</button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}
