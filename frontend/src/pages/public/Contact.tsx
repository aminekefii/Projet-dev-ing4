import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { messages, type ContactForm } from '../../api'
import { useAuth } from '../../auth/useAuth'
import { Notice } from '../../components/Notice'
import { usePageTitle } from '../../hooks/usePageTitle'
import { noop } from '../../lib/noop'
import { wow } from '../../lib/wow'

/** Router state set by the home page's contact form. */
interface FromHome { error?: string; form?: ContactForm }

export default function Contact() {
  usePageTitle('Contact — TEK-UP Certified Students')
  const { user } = useAuth()
  const student = user?.role === 'student' ? user : null
  const navigate = useNavigate()
  const location = useLocation()
  const fromHome = (location.state ?? {}) as FromHome
  const [params] = useSearchParams()
  const sent = params.get('sent') === '1'
  const [form, setForm] = useState<ContactForm>(fromHome.form ?? { name: '', surname: '', email: '', message: '' })
  const [error, setError] = useState(fromHome.error ?? '')
  const [busy, setBusy] = useState(false)

  // A logged-in student's identity comes from the session (as v1).
  const shown: ContactForm = student
    ? { ...form, name: student.firstname ?? '', surname: student.lastname ?? '', email: student.email }
    : form
  const set = (field: keyof ContactForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await messages.send(form)
      setForm(f => ({ ...f, message: '' }))
      navigate('/contact?sent=1', { replace: true, state: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please fill in all fields.')
      if (sent) navigate('/contact', { replace: true, state: null })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="contact-page section">
      <div className="container">
        <div className="row">
          <div {...wow('fadeInLeft', '0.5s', '0.25s', 'col-lg-6 align-self-center')}>
            <div className="section-heading">
              <h6>Certified Students Portal</h6>
              <h2>Talk to the <em>Certifications</em> <span>Office</span></h2>
              <p>Use the form below to reach the Certifications Office. We answer within one business day.</p>
              <div className="phone-info">
                <h4>Certifications Office: <span><i className="fa fa-phone"></i> <a href="#" onClick={noop}>+216 70 250 000</a></span></h4>
              </div>
            </div>
          </div>
          <div {...wow('fadeInRight', '0.5s', '0.25s', 'col-lg-6')}>
            <form id="contact" onSubmit={onSubmit}>
              {sent && !error && <Notice type="success" message={<>Thanks &mdash; your message has been received. The Certifications Office will reply within one business day.</>} />}
              {error && <Notice type="error" message={error} />}

              {student && (
                <p className="contact-signed-in">
                  <i className="fa fa-user-circle" aria-hidden="true"></i>
                  {' '}Signed in as <strong>{`${shown.name} ${shown.surname}`.trim()}</strong> &mdash; your details are filled in below.
                </p>
              )}

              <div className="row">
                <div className="col-lg-6">
                  <fieldset>
                    <input type="text" name="name" id="name" placeholder="Name" autoComplete="on" value={shown.name} onChange={set('name')} disabled={!!student} required={!student} />
                  </fieldset>
                </div>
                <div className="col-lg-6">
                  <fieldset>
                    <input type="text" name="surname" id="surname" placeholder="Surname" autoComplete="on" value={shown.surname} onChange={set('surname')} disabled={!!student} required={!student} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <input type="email" name="email" id="email" placeholder="Your Email" value={shown.email} onChange={set('email')} disabled={!!student} required={!student} />
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <textarea name="message" id="message" className="form-control" placeholder="Message" required value={form.message} onChange={set('message')}></textarea>
                  </fieldset>
                </div>
                <div className="col-lg-12">
                  <fieldset>
                    <button type="submit" id="form-submit" className="main-button" disabled={busy}>Send Message</button>
                  </fieldset>
                </div>
              </div>
              <div className="contact-dec">
                <img src="/assets/images/contact-decoration.png" alt="" />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
