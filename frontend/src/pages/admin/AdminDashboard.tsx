import { Link } from 'react-router-dom'
import { stats } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { useAsync } from '../../hooks/useAsync'
import { usePageTitle } from '../../hooks/usePageTitle'
import { plural } from '../../lib/format'
import { wow } from '../../lib/wow'

export default function AdminDashboard() {
  usePageTitle('Admin Dashboard — TEK-UP')
  const { data, error } = useAsync(() => stats.adminDashboard(), [])
  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />

  return (
    <div className="dashboard-page section">
      <div className="container">
        <div className="row">
          <div {...wow('fadeInDown', '1s', '0.2s', 'col-lg-12')}>
            <div className="dashboard-hello">
              <h6>TEK-UP Admin Console</h6>
              <h2>Good day, <em>Administrator</em></h2>
              <p>Manage voucher requests, monitor portal usage, post announcements and respond to student messages from one place.</p>
            </div>
          </div>
        </div>

        <div className="row dashboard-cards admin-cards">
          <div {...wow('fadeInUp', '1s', '0.30s', 'col-lg-3 col-md-6')}>
            <Link className="dash-card-link" to="/admin/vouchers">
              <div className="dash-card">
                <div className="dash-icon"><i className="fa fa-ticket"></i></div>
                <h4>Vouchers</h4>
                <p>
                  {data.pendingVouchers > 0
                    ? <><strong>{data.pendingVouchers}</strong> pending request{plural(data.pendingVouchers)} awaiting approval.</>
                    : <>Inbox empty &mdash; no voucher requests pending.</>}
                </p>
                <span className="dash-link">Review &rarr;</span>
              </div>
            </Link>
          </div>

          <div {...wow('fadeInUp', '1s', '0.40s', 'col-lg-3 col-md-6')}>
            <Link className="dash-card-link" to="/admin/stats">
              <div className="dash-card">
                <div className="dash-icon"><i className="fa fa-line-chart"></i></div>
                <h4>Statistics</h4>
                <p><strong>{data.students}</strong> student{plural(data.students)} &middot; <strong>{data.enrolments}</strong> active enrolment{plural(data.enrolments)}.</p>
                <span className="dash-link">View report &rarr;</span>
              </div>
            </Link>
          </div>

          <div {...wow('fadeInUp', '1s', '0.50s', 'col-lg-3 col-md-6')}>
            <Link className="dash-card-link" to="/admin/news">
              <div className="dash-card">
                <div className="dash-icon"><i className="fa fa-newspaper-o"></i></div>
                <h4>News</h4>
                <p>Publish announcements that appear on the public homepage and student portal.</p>
                <span className="dash-link">Open editor &rarr;</span>
              </div>
            </Link>
          </div>

          <div {...wow('fadeInUp', '1s', '0.60s', 'col-lg-3 col-md-6')}>
            <Link className="dash-card-link" to="/admin/messages">
              <div className="dash-card">
                <div className="dash-icon"><i className="fa fa-envelope-o"></i></div>
                <h4>Messages</h4>
                <p>
                  {data.unreadMessages > 0
                    ? <><strong>{data.unreadMessages}</strong> new message{plural(data.unreadMessages)} in the inbox.</>
                    : <>Inbox empty &mdash; no new contact-form messages.</>}
                </p>
                <span className="dash-link">Open inbox &rarr;</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
