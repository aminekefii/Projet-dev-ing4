import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { homeFor } from '../../auth/homeFor'
import { useAuth } from '../../auth/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import { noop } from '../../lib/noop'
import { wow } from '../../lib/wow'

export default function Login() {
  usePageTitle('Sign In — TEK-UP Certified Students')
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && user) return <Navigate to={homeFor(user.role)} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const u = await login(email, password)
      navigate(homeFor(u.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.')
      setPassword('')
      setBusy(false)
    }
  }

  return (
    <div className="login-page section">
      <div className="container">
        <div className="row align-items-center">
          <div {...wow('fadeInLeft', '1s', '0.2s', 'col-lg-6')}>
            <div className="login-intro">
              <h6>Certified Students Portal</h6>
              <h2>Welcome <em>back</em> to your <span>Certifications</span> dashboard</h2>
              <p>Track your enrolment, schedule exam sessions, and download every certificate earned along your TEK-UP journey &mdash; from Cisco to AWS, Microsoft, OffSec and beyond.</p>
              <ul className="pillars">
                <li>1,400+ certifications issued to TEK-UP students.</li>
                <li>Weekly proctored exam slots across 17+ global vendors.</li>
              </ul>
            </div>
          </div>

          <div {...wow('fadeInRight', '1s', '0.2s', 'col-lg-6')}>
            <form id="login" className="login-card" onSubmit={onSubmit}>
              <div className="login-card-heading">
                <h3>Sign in</h3>
                <p>Use your TEK-UP credentials to continue.</p>
              </div>

              {error && <div className="login-error">{error}</div>}

              <div className="row">
                <div className="col-lg-12">
                  <fieldset>
                    <label htmlFor="email">Email</label>
                    <input type="email" name="email" id="email" placeholder="you@tek-up.de" required value={email} onChange={e => setEmail(e.target.value)} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <label htmlFor="password">Password</label>
                    <input type="password" name="password" id="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" required value={password} onChange={e => setPassword(e.target.value)} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <div className="login-row">
                    <label className="remember"><input type="checkbox" name="remember" /> <span>Remember me</span></label>
                    <a href="#" onClick={noop} className="forgot">Forgot password?</a>
                  </div>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <button type="submit" id="form-submit" className="main-button" disabled={busy}>Sign In</button>
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <p className="signup-line">Not a student yet? <Link to="/#contact">Talk to the Certifications Office &rarr;</Link></p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
