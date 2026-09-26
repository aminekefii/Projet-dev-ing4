import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { certifications, type CatalogItem, type Flash } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { Modal } from '../../components/Modal'
import { Notice } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { usePageTitle } from '../../hooks/usePageTitle'
import { wow } from '../../lib/wow'

export default function Catalog() {
  usePageTitle('Catalog — TEK-UP Certified Students')
  const { data: groups, error, reload } = useAsync(() => certifications.listCatalog(), [])
  const [flash, setFlash] = useState<Flash | null>(null)
  const [target, setTarget] = useState<CatalogItem | null>(null)
  const [password, setPassword] = useState('')
  const { busy, run } = useBusy()

  if (error) return <ErrorBox error={error} />
  if (!groups) return <Loading />

  const close = () => {
    setTarget(null)
    setPassword('')
  }

  // v1 shows the result on the page (no redirect), not in the modal.
  const onConfirm = (e: FormEvent) => {
    e.preventDefault()
    if (!target) return
    const current = target
    void run(async () => {
      try {
        setFlash(await certifications.enroll(current.id, password))
        reload()
      } catch (err) {
        setFlash({ type: 'error', message: err instanceof Error ? err.message : 'Enrollment failed. Please try again.' })
      } finally {
        close()
      }
    })
  }

  return (
    <>
      <div className="catalog-page section">
        <div className="container">
          <div className="row">
            <div {...wow('fadeInDown', '1s', '0.2s', 'col-lg-12')}>
              <div className="catalog-hello">
                <h6>Certifications Catalog</h6>
                <h2>Pick a <em>track</em> &amp; <span>start your journey</span></h2>
                <p>All certifications are included in your TEK-UP tuition. Enroll in one to add it to your dashboard and start preparing.</p>
                <Link to="/certifications" className="back-link"><i className="fa fa-arrow-left"></i> Back to my certifications</Link>
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

          {groups.map(group => (
            <div className="catalog-section" key={group.category}>
              <h3 className="catalog-category">{group.label} <span className="cat-count">{group.items.length}</span></h3>

              <div className="row catalog-grid">
                {group.items.map((c, i) => (
                  <div key={c.id} {...wow('fadeInUp', '1s', `${Math.min(0.15 + 0.05 * i, 0.6).toFixed(2)}s`, 'col-lg-4 col-md-6')}>
                    <article className={`catalog-card${c.enrolled ? ' is-enrolled' : ''}`}>
                      <div className="cat-top">
                        <span className="cat-provider">{c.provider}</span>
                        <span className="cat-code">{c.code}</span>
                      </div>
                      <h4>{c.name}</h4>
                      <p>{c.description}</p>
                      <div className="cat-action">
                        {c.enrolled ? (
                          <span className="enrolled-pill"><i className="fa fa-check"></i> Enrolled</span>
                        ) : c.featured ? (
                          <button type="button" className="enroll-btn" onClick={() => setTarget(c)}>
                            Enroll &rarr;
                          </button>
                        ) : (
                          <button type="button" className="enroll-btn is-locked" disabled aria-disabled="true" title="Not open for enrolment yet">
                            <i className="fa fa-lock"></i> Locked
                          </button>
                        )}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={target !== null} onClose={close} contentClassName="enroll-modal" labelledBy="enrollConfirmLabel">
        <form onSubmit={onConfirm} autoComplete="off">
          <div className="modal-body">
            <div className="enroll-icon"><i className="fa fa-lock"></i></div>
            <h4 id="enrollConfirmLabel">Confirm enrolment</h4>
            <p>You are about to enroll in <strong id="enrollCertName">{target?.name ?? '—'}</strong> <span className="enroll-cert-code" id="enrollCertCode">({target?.code})</span>. Please enter your password to confirm.</p>

            <fieldset>
              <label htmlFor="enrollPassword" className="visually-hidden">Password</label>
              <input
                type="password"
                name="password"
                id="enrollPassword"
                className="enroll-password-input"
                placeholder="Your password"
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </fieldset>

            <div className="enroll-actions">
              <button type="submit" className="main-button" disabled={busy}>Confirm enrolment</button>
              <button type="button" className="cancel-link" onClick={close}>Cancel</button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}
