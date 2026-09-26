import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError, isApiError, whiteTest } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { Notice } from '../../components/Notice'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { useIdParam } from '../../hooks/useIdParam'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function WhiteTestResult() {
  usePageTitle('White Test — Result')
  const certId = useIdParam('certId')
  const navigate = useNavigate()
  const { busy, error: actionError, run } = useBusy()
  const { data: result, error } = useAsync(
    () => (certId ? whiteTest.result(certId) : Promise.reject(new ApiError(404, 'Certification not found.'))),
    [certId],
  )

  if (!certId || isApiError(error, 404)) return <Navigate to="/certifications" replace />
  if (error) return <ErrorBox error={error} />
  if (result === undefined) return <Loading />
  if (result === null) return <Navigate to={`/white-test/${certId}`} replace />

  const cert = result.certification
  const onRetake = () => run(async () => {
    await whiteTest.start(cert.id)
    navigate(`/white-test/${cert.id}/take`)
  })

  return (
    <div className="course-page section">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="course-head">
              <h6>{cert.provider} &middot; {cert.code}</h6>
              <h2>White Test &mdash; Result</h2>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="wt-result-header">
              <div className="wt-score">{result.correct} / {result.total}</div>
              <div className="wt-pct">{result.pct} %</div>
              {result.passed
                ? <span className="wt-badge is-pass">✓ Passed</span>
                : <span className="wt-badge is-fail">✗ Not passed</span>}
              <div className="wt-result-meta">Passing score: 70 %</div>
            </div>

            <div className="wt-review">
              {result.items.map((r, i) => {
                const pickClass = r.isCorrect ? 'is-correct' : r.userAnswer ? 'is-wrong' : 'is-missing'
                return (
                  <div key={i} className={`wt-review-item ${r.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                    <div className="wt-review-q">{i + 1}. {r.question}</div>
                    <div className="wt-review-line">
                      <span className="wt-label">Your answer</span>
                      <span className={`wt-pick ${pickClass}`}>{r.userAnswer ? `${r.userAnswer}) ${r.choices[r.userAnswer]}` : '— no answer —'}</span>
                    </div>
                    {!r.isCorrect && (
                      <div className="wt-review-line">
                        <span className="wt-label">Correct answer</span>
                        <span className="wt-pick is-correct">{r.correctAnswer}) {r.choices[r.correctAnswer]}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {actionError && <Notice type="error" message={actionError} />}
            <div className="wt-actions">
              {result.passed ? (
                <>
                  <Link to="/final-exams" className="wt-btn wt-btn--primary">
                    <span>Final exam</span>
                    <span className="wt-btn-arrow" aria-hidden="true">→</span>
                  </Link>
                  <Link to="/dashboard" className="wt-btn wt-btn--ghost">Back to dashboard</Link>
                </>
              ) : (
                <>
                  <button type="button" className="wt-btn wt-btn--soft" onClick={() => void onRetake()} disabled={busy}>Retake exam</button>
                  <Link to="/dashboard" className="wt-btn wt-btn--ghost">Back to dashboard</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
