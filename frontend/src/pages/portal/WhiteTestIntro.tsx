import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError, isApiError, whiteTest } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { Notice } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { useIdParam } from '../../hooks/useIdParam'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function WhiteTestIntro() {
  const certId = useIdParam('certId')
  const navigate = useNavigate()
  const { data, error } = useAsync(
    () => (certId ? whiteTest.getIntro(certId) : Promise.reject(new ApiError(404, 'Certification not found.'))),
    [certId],
  )
  const { busy, run } = useBusy()
  const [startError, setStartError] = useState('')
  usePageTitle(data ? `White Test — ${data.certification.name}` : 'White Test')

  if (!certId || isApiError(error, 404)) return <Navigate to="/certifications" replace />
  if (isApiError(error, 403)) return <Navigate to={`/course/${certId}`} replace />
  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />

  const cert = data.certification
  const onStart = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      try {
        await whiteTest.start(cert.id)
        navigate(`/white-test/${cert.id}/take`)
      } catch (err) {
        setStartError(err instanceof Error ? err.message : 'Could not start the test.')
      }
    })
  }

  return (
    <div className="course-page section">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <Link to={`/course/${cert.id}`} className="back-link"><i className="fa fa-arrow-left"></i> Back to the course</Link>
            <div className="course-head">
              <h6>{cert.provider} &middot; {cert.code}</h6>
              <h2>White Test &mdash; {cert.name}</h2>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="course-stage" style={{ textAlign: 'center' }}>
              {!data.available ? (
                /* v1 crashed here for certifications without a question bank (spec §8). */
                <Notice type="info" message="No white test available yet." />
              ) : (
                <>
                  <i className="fa fa-trophy" style={{ fontSize: 48, color: '#c9a44a' }}></i>
                  <h3 style={{ marginTop: 16 }}>You unlocked the white test</h3>
                  <p style={{ marginTop: 8, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
                    Congratulations on finishing every video in {cert.name}.
                    The white test is a final check of your knowledge before the official certification exam.
                  </p>
                  {startError && <Notice type="error" message={startError} />}
                  <form onSubmit={onStart} style={{ marginTop: 16 }}>
                    <button type="submit" className="wt-btn wt-btn--primary" disabled={busy}>
                      <span>Start the test</span>
                      <span className="wt-btn-arrow" aria-hidden="true">→</span>
                    </button>
                  </form>

                  <div className="test-meta">
                    <div className="test-meta-card">
                      <i className="fa fa-clock-o" aria-hidden="true"></i>
                      <span className="test-meta-caption">Time limit</span>
                      <span className="test-meta-value">10 minutes</span>
                    </div>
                    <div className="test-meta-card">
                      <i className="fa fa-question-circle" aria-hidden="true"></i>
                      <span className="test-meta-caption">Questions</span>
                      <span className="test-meta-value">{data.questionCount}</span>
                    </div>
                    <div className="test-meta-card">
                      <i className="fa fa-percent" aria-hidden="true"></i>
                      <span className="test-meta-caption">Passing score</span>
                      <span className="test-meta-value">70%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
