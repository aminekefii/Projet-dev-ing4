import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { certifications, type Flash, type MyCertification, type MyFilter } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { Modal } from '../../components/Modal'
import { Notice } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDate, pad2 } from '../../lib/format'
import { noop } from '../../lib/noop'
import { wow } from '../../lib/wow'

const FILTERS: [MyFilter, string][] = [['all', 'All'], ['earned', 'Earned'], ['in_progress', 'In progress']]

function toFilter(value: string | null): MyFilter {
  return value === 'earned' || value === 'in_progress' ? value : 'all'
}

export default function Certifications() {
  usePageTitle('My Certifications — TEK-UP Certified Students')
  const [params] = useSearchParams()
  const filter = toFilter(params.get('filter'))
  const { data, error, reload } = useAsync(() => certifications.listMine(filter), [filter])
  const [flash, setFlash] = useState<Flash | null>(null)
  const [cancelTarget, setCancelTarget] = useState<MyCertification | null>(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const { busy, run } = useBusy()

  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />

  const isEmpty = data.total === 0

  const onCancel = (e: FormEvent) => {
    e.preventDefault()
    if (!cancelTarget) return
    const current = cancelTarget
    void run(async () => {
      try {
        setFlash(await certifications.cancel(current.certification.id))
        reload()
      } catch (err) {
        setFlash({ type: 'error', message: err instanceof Error ? err.message : 'Could not cancel the enrolment. Please try again.' })
      } finally {
        setCancelTarget(null)
      }
    })
  }

  return (
    <>
      <div className="certs-page section">
        <div className="container">
          <div className="row">
            <div {...wow('fadeInDown', '1s', '0.2s', 'col-lg-12')}>
              <div className="certs-hello">
                <h6>Certified Students Portal</h6>
                <h2>My <em>Certifications</em> &amp; <span>Tracks</span></h2>
                <p>Every certificate you have earned, every exam in progress, and the tracks still open to you at TEK-UP.</p>
              </div>
            </div>
          </div>

          {flash && (
            <div className="row">
              <div className="col-lg-12">
                <Notice type={flash.type} message={flash.message} />
              </div>
            </div>
          )}

          <div className="row certs-stats">
            <div {...wow('fadeInUp', '1s', '0.25s', 'col-md-4')}>
              <div className="stat-card">
                <span className="stat-number">{pad2(data.earned)}</span>
                <span className="stat-caption">Earned</span>
              </div>
            </div>
            <div {...wow('fadeInUp', '1s', '0.35s', 'col-md-4')}>
              <div className="stat-card">
                <span className="stat-number">{pad2(data.inProgress)}</span>
                <span className="stat-caption">In progress</span>
              </div>
            </div>
            <div {...wow('fadeInUp', '1s', '0.45s', 'col-md-4')}>
              <div className="stat-card">
                <span className="stat-number">{data.available}+</span>
                <span className="stat-caption">Available tracks</span>
              </div>
            </div>
          </div>

          {!isEmpty ? (
            <>
              <div {...wow('fadeIn', '1s', '0.4s', 'certs-filters')}>
                {FILTERS.map(([key, label]) => (
                  <Link key={key} className={`filter-chip${key === filter ? ' is-active' : ''}`} to={`/certifications?filter=${key}`}>{label}</Link>
                ))}
                <Link className="filter-chip catalog-chip" to="/catalog"><i className="fa fa-plus"></i> Enroll in more</Link>
              </div>

              <div className="row certs-grid">
                {data.items.map((c, i) => (
                  <div key={c.certification.id} {...wow('fadeInUp', '1s', `${(0.2 + 0.1 * i).toFixed(2)}s`, 'col-lg-4 col-md-6')}>
                    <article className="cert-card">
                      <div className="cert-top">
                        <span className="cert-provider">{c.certification.provider}</span>
                        <span className={`cert-status is-${c.status === 'earned' ? 'earned' : 'progress'}`}>{c.status === 'earned' ? 'Earned' : 'In progress'}</span>
                      </div>
                      <h4>{c.certification.name}</h4>
                      <p>{c.certification.description}</p>
                      {c.status === 'in_progress' && (
                        <div className="cert-progress">
                          <div className="bar"><span style={{ width: `${c.progress}%` }}></span></div>
                          <span className="progress-label">{c.progress}%</span>
                        </div>
                      )}
                      <div className="cert-meta">
                        {c.status === 'earned' ? (
                          <>
                            <span><i className="fa fa-calendar"></i> Earned {c.earnedAt ? formatDate(c.earnedAt) : ''}</span>
                            <a href="#" onClick={noop} className="cert-action">View certificate &rarr;</a>
                          </>
                        ) : (
                          <>
                            <span><i className="fa fa-clock-o"></i> Enrolled {formatDate(c.enrolledAt)}</span>
                            <div className="cert-card-actions">
                              <Link to={`/course/${c.certification.id}`} className="cert-action">Continue &rarr;</Link>
                              <button type="button" className="cert-cancel-btn" onClick={() => setCancelTarget(c)}>Cancel</button>
                            </div>
                          </>
                        )}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div {...wow('fadeIn', '1s', '0.3s', 'certs-empty')}>
              <div className="empty-icon"><i className="fa fa-certificate"></i></div>
              <h3>No certifications yet</h3>
              <p>You have not enrolled in any certification. Browse the TEK-UP catalog to get started.</p>
              <Link to="/catalog" className="main-button">Start Enrolling</Link>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding: shown on every visit while the list is empty (as v1). */}
      <Modal open={isEmpty && !onboardingDismissed} onClose={() => setOnboardingDismissed(true)} staticBackdrop contentClassName="enroll-modal" labelledBy="enrollModalLabel">
        <div className="modal-body">
          <div className="enroll-icon"><i className="fa fa-graduation-cap"></i></div>
          <h4 id="enrollModalLabel">Get started with your first certification</h4>
          <p>You don't have any certifications yet. Pick one from the TEK-UP catalog — {data.catalogSize} tracks across Cisco, AWS, Red Hat, Microsoft, Python, IELTS and more.</p>
          <div className="enroll-actions">
            <Link to="/catalog" className="main-button">Start Enrolling</Link>
            <button type="button" className="cancel-link" onClick={() => setOnboardingDismissed(true)}>Maybe later</button>
          </div>
        </div>
      </Modal>

      <Modal open={cancelTarget !== null} onClose={() => setCancelTarget(null)} contentClassName="enroll-modal cancel-modal" labelledBy="cancelConfirmLabel">
        <form onSubmit={onCancel}>
          <div className="modal-body">
            <div className="enroll-icon cancel-icon"><i className="fa fa-exclamation-triangle"></i></div>
            <h4 id="cancelConfirmLabel">Cancel this enrolment?</h4>
            <p>You are about to cancel your enrolment in <strong id="cancelCertName">{cancelTarget?.certification.name ?? '—'}</strong> <span className="enroll-cert-code" id="cancelCertCode">({cancelTarget?.certification.code})</span>. Your progress will be lost. You can re-enroll later from the catalog.</p>
            <div className="enroll-actions">
              <button type="submit" className="main-button danger" disabled={busy}>Yes, cancel enrolment</button>
              <button type="button" className="cancel-link" onClick={() => setCancelTarget(null)}>Keep my enrolment</button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}
