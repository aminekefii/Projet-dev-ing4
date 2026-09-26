import { Link, useSearchParams } from 'react-router-dom'
import { vouchers, type VoucherStatus } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { FeFlash } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { usePageTitle } from '../../hooks/usePageTitle'
import { wow } from '../../lib/wow'

const SEAL: Record<VoucherStatus | 'none', string> = {
  none: 'fa-check-circle',
  pending: 'fa-hourglass-half',
  approved: 'fa-trophy',
  rejected: 'fa-times-circle',
}

export default function FinalExams() {
  usePageTitle('Final Exam Vouchers — TEK-UP')
  const [params, setParams] = useSearchParams()
  const { data: eligible, error, reload } = useAsync(() => vouchers.listReady(), [])
  const { busy, error: actionError, run } = useBusy()

  if (error) return <ErrorBox error={error} />
  if (!eligible) return <Loading />

  const onRequest = (certId: number) => run(async () => {
    await vouchers.request(certId)
    setParams({ flash: 'requested' }, { replace: true })
    reload()
  })

  return (
    <div className="fe-page section">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div {...wow('fadeInDown', '0.8s', undefined, 'fe-head')}>
              <h6>Certified Students Portal</h6>
              <h2>Final Exam <em>Vouchers</em></h2>
              <p>Your course material is complete. Request a voucher to schedule the official certification exam at a TEK-UP testing centre &mdash; one business day turnaround.</p>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="row">
            <div className="col-lg-12">
              <FeFlash error><span>{actionError}</span></FeFlash>
            </div>
          </div>
        )}

        {!actionError && params.get('flash') === 'requested' && (
          <div className="row">
            <div className="col-lg-12">
              <FeFlash icon="fa-paper-plane">
                <span>Voucher request submitted — our certifications office will email you within one business day.</span>
              </FeFlash>
            </div>
          </div>
        )}

        {eligible.length === 0 ? (
          <div className="row">
            <div className="col-lg-8 offset-lg-2">
              <div {...wow('fadeInUp', '1s', '0.15s', 'fe-empty')}>
                <div className="fe-empty__icon"><i className="fa fa-graduation-cap" aria-hidden="true"></i></div>
                <h3>No courses ready yet</h3>
                <p>Finish every video in a certification track, pass the white test, and the cert will appear here so you can request your exam voucher.</p>
                <Link to="/certifications" className="wt-btn wt-btn--primary">
                  <span>View my certifications</span>
                  <span className="wt-btn-arrow" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="row">
            <div className="col-lg-12">
              <ul className="fe-list">
                {eligible.map(({ certification: c, voucher }, i) => (
                  <li key={c.id} {...wow('fadeInUp', '0.7s', `${(0.15 + 0.08 * i).toFixed(2)}s`, 'fe-row')}>
                    <div className="fe-row__seal" aria-hidden="true">
                      <i className={`fa ${SEAL[voucher ?? 'none']}`}></i>
                    </div>
                    <div className="fe-row__meta">
                      <div className="fe-row__provider">{c.provider} &middot; {c.code}</div>
                      <h4 className="fe-row__title">{c.name}</h4>
                      <p className="fe-row__desc">{c.description}</p>
                      <div className="fe-row__tags">
                        <span className="fe-tag fe-tag--ready"><i className="fa fa-check" aria-hidden="true"></i> Course complete</span>
                        {voucher === 'pending' && <span className="fe-tag fe-tag--pending"><i className="fa fa-clock-o" aria-hidden="true"></i> Voucher requested</span>}
                        {voucher === 'approved' && <span className="fe-tag fe-tag--approved"><i className="fa fa-check-circle" aria-hidden="true"></i> Voucher approved</span>}
                        {voucher === 'rejected' && <span className="fe-tag fe-tag--rejected"><i className="fa fa-times-circle" aria-hidden="true"></i> Voucher rejected</span>}
                      </div>
                    </div>
                    <div className="fe-row__action">
                      {voucher === 'approved' ? (
                        <>
                          <button type="button" className="wt-btn wt-btn--soft" disabled>Voucher issued</button>
                          <span className="fe-row__note">Check your inbox for the exam slot.</span>
                        </>
                      ) : voucher === 'pending' ? (
                        <>
                          <button type="button" className="wt-btn wt-btn--soft" disabled>Voucher requested</button>
                          <span className="fe-row__note">We'll be in touch soon.</span>
                        </>
                      ) : (
                        <>
                          <button type="button" className="wt-btn wt-btn--primary" disabled={busy} onClick={() => void onRequest(c.id)}>
                            <span>{voucher === 'rejected' ? 'Request again' : 'Request voucher'}</span>
                            <span className="wt-btn-arrow" aria-hidden="true">→</span>
                          </button>
                          {voucher === 'rejected' && <span className="fe-row__note">Previous request was declined.</span>}
                        </>
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
  )
}
