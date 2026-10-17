import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { MIN_PASSWORD } from '../../api/auth'
import { homeFor } from '../../auth/homeFor'
import { useAuth } from '../../auth/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import { wow } from '../../lib/wow'

export default function Signup() {
  usePageTitle('Sign Up — TEK-UP Certified Students')
  const { user, ready, register } = useAuth()
  const navigate = useNavigate()
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && user) return <Navigate to={homeFor(user.role)} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      setConfirm('')
      return
    }
    setBusy(true)
    try {
      const u = await register({ firstname, lastname, email, password })
      navigate(homeFor(u.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
      setPassword('')
      setConfirm('')
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
              <h2>Start your <em>journey</em> towards your next <span>Certification</span></h2>
              <p>Create your student account to browse the catalog, enrol in courses, practise with white tests and request exam vouchers &mdash; all in one place.</p>
              <ul className="pillars">
                <li>Free access to the full certification catalog.</li>
                <li>Track your progress and every certificate you earn.</li>
              </ul>
            </div>
          </div>

          <div {...wow('fadeInRight', '1s', '0.2s', 'col-lg-6')}>
            <form id="signup" className="login-card" onSubmit={onSubmit}>
              <div className="login-card-heading">
                <h3>Sign up</h3>
                <p>Create your TEK-UP student account.</p>
              </div>

              {error && <div className="login-error">{error}</div>}

              <div className="row">
                <div className="col-lg-6">
                  <fieldset>
                    <label htmlFor="firstname">First name</label>
                    <input type="text" name="firstname" id="firstname" autoComplete="given-name" maxLength={100} required value={firstname} onChange={e => setFirstname(e.target.value)} />
                  </fieldset>
                </div>
                <div className="col-lg-6">
                  <fieldset>
                    <label htmlFor="lastname">Last name</label>
                    <input type="text" name="lastname" id="lastname" autoComplete="family-name" maxLength={100} required value={lastname} onChange={e => setLastname(e.target.value)} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <label htmlFor="email">Email</label>
                    <input type="email" name="email" id="email" placeholder="you@tek-up.de" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <label htmlFor="password">Password</label>
                    <input type="password" name="password" id="password" placeholder={`At least ${MIN_PASSWORD} characters`} autoComplete="new-password" minLength={MIN_PASSWORD} required value={password} onChange={e => setPassword(e.target.value)} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <label htmlFor="confirm">Confirm password</label>
                    <input type="password" name="confirm" id="confirm" autoComplete="new-password" minLength={MIN_PASSWORD} required value={confirm} onChange={e => setConfirm(e.target.value)} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <button type="submit" id="form-submit" className="main-button" disabled={busy}>Create Account</button>
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <p className="signup-line">Already have an account? <Link to="/login">Sign in &rarr;</Link></p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
