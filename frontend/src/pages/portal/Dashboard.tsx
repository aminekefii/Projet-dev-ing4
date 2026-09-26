import { Link } from 'react-router-dom'
import { stats } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { useAsync } from '../../hooks/useAsync'
import { usePageTitle } from '../../hooks/usePageTitle'
import { plural } from '../../lib/format'
import { wow } from '../../lib/wow'

export default function Dashboard() {
  usePageTitle('Dashboard — TEK-UP Certified Students')
  const { data, error } = useAsync(() => stats.dashboard(), [])
  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />

  return (
    <div className="dashboard-page section">
      <div className="container">
        <div className="row">
          <div {...wow('fadeInDown', '1s', '0.2s', 'col-lg-12')}>
            <div className="dashboard-hello">
              <h6>Certified Students Portal</h6>
              <h2>Welcome <em>back</em>, <span>{data.displayName}</span></h2>
              <p>You are signed in as {data.email}. Track your certifications, exam schedule and profile from here.</p>
            </div>
          </div>
        </div>

        <div className="row dashboard-cards">
          <div {...wow('fadeInUp', '1s', '0.3s', 'col-lg-4 col-md-6')}>
            <div className="dash-card">
              <div className="dash-icon"><i className="fa fa-certificate"></i></div>
              <h4>My Certifications</h4>
              <p>{data.earned} earned &middot; {data.inProgress} in progress</p>
              <Link to="/certifications" className="dash-link">View all &rarr;</Link>
            </div>
          </div>
          <div {...wow('fadeInUp', '1s', '0.45s', 'col-lg-4 col-md-6')}>
            <div className="dash-card">
              <div className="dash-icon"><i className="fa fa-calendar"></i></div>
              <h4>Final Exams</h4>
              <p>
                {data.examReady > 0
                  ? `${data.examReady} course${plural(data.examReady)} ready for the official exam.`
                  : 'Finish a course to unlock voucher requests.'}
              </p>
              <Link to="/final-exams" className="dash-link">Request a voucher &rarr;</Link>
            </div>
          </div>
          <div {...wow('fadeInUp', '1s', '0.6s', 'col-lg-4 col-md-6')}>
            <div className="dash-card">
              <div className="dash-icon"><i className="fa fa-user"></i></div>
              <h4>Profile</h4>
              <p>Manage your TEK-UP credentials.</p>
              <Link to="/profile" className="dash-link">Edit profile &rarr;</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
