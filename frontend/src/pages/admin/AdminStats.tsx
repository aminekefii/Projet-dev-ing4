import { stats } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { useAsync } from '../../hooks/useAsync'
import { usePageTitle } from '../../hooks/usePageTitle'
import { wow } from '../../lib/wow'

export default function AdminStats() {
  usePageTitle('Statistics — Admin')
  const { data, error } = useAsync(() => stats.adminStats(), [])
  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />

  return (
    <div className="fe-page section">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div {...wow('fadeInDown', '0.8s', undefined, 'fe-head')}>
              <h6>TEK-UP Admin Console</h6>
              <h2>Portal <em>Statistics</em></h2>
              <p>A snapshot of the certified-students portal: enrolment activity, course completion and voucher pipeline.</p>
            </div>
          </div>
        </div>

        <div className="row admin-stats-grid">
          <div className="col-lg-3 col-md-6">
            <div className="admin-stat">
              <div className="admin-stat__label">Registered students</div>
              <div className="admin-stat__value">{data.students}</div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="admin-stat">
              <div className="admin-stat__label">Certifications in catalog</div>
              <div className="admin-stat__value">{data.catalogSize}</div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="admin-stat">
              <div className="admin-stat__label">Enrolments (total)</div>
              <div className="admin-stat__value">{data.enrolments}</div>
              <div className="admin-stat__note">{data.inProgress} in progress &middot; {data.earned} earned</div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="admin-stat">
              <div className="admin-stat__label">Courses ready for exam</div>
              <div className="admin-stat__value">{data.examReady}</div>
              <div className="admin-stat__note">student-cert pairs at 100&nbsp;%</div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="admin-stat">
              <div className="admin-stat__label">Voucher requests</div>
              <div className="admin-stat__value">{data.vouchers}</div>
              <div className="admin-stat__note">{data.pendingVouchers} pending</div>
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 28 }}>
          <div className="col-lg-12">
            <div className="admin-panel">
              <h3>Top 5 certifications by enrolment</h3>
              {data.top.length === 0 ? (
                <p className="admin-empty-line">No enrolments yet.</p>
              ) : (
                <ol className="admin-rank">
                  {data.top.map(row => (
                    <li className="admin-rank__item" key={row.code}>
                      <div className="admin-rank__head">
                        <span className="admin-rank__provider">{row.provider} &middot; {row.code}</span>
                        <span className="admin-rank__count">{row.count}</span>
                      </div>
                      <div className="admin-rank__title">{row.name}</div>
                      <div className="admin-rank__bar"><span style={{ width: `${row.barPct}%` }}></span></div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
