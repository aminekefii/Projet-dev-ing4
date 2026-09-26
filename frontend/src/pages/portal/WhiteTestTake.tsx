import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { whiteTest, type Choice, type TakeView } from '../../api'
import { ErrorBox, Loading } from '../../components/Loading'
import { useAsync } from '../../hooks/useAsync'
import { useBusy } from '../../hooks/useBusy'
import { useIdParam } from '../../hooks/useIdParam'
import { usePageTitle } from '../../hooks/usePageTitle'
import { pad2 } from '../../lib/format'

export default function WhiteTestTake() {
  usePageTitle('White Test — In progress')
  const certId = useIdParam('certId')
  const [step, setStep] = useState(0)
  const { data: view, error, loading } = useAsync(
    () => (certId ? whiteTest.current(certId) : Promise.resolve<TakeView>({ status: 'none' })),
    [certId, step],
  )

  if (error) return <ErrorBox error={error} />
  // Don't show the previous question while the next one loads (it could be answered twice).
  if (!view || loading) return <Loading />
  if (!certId || view.status === 'none') return <Navigate to="/certifications" replace />
  if (view.status === 'submitted') return <Navigate to={`/white-test/${certId}/result`} replace />
  return <QuestionForm key={view.index} certId={certId} view={view} onNext={() => setStep(s => s + 1)} />
}

type QuestionView = Extract<TakeView, { status: 'question' }>

function QuestionForm({ certId, view, onNext }: { certId: number; view: QuestionView; onNext(): void }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Choice | null>(view.selected)
  const [postError, setPostError] = useState('')
  const { busy, run } = useBusy()
  const isLast = view.index === view.total - 1

  const submit = (choice: Choice | null) => run(async () => {
    try {
      const r = await whiteTest.answer(certId, choice)
      if (r === 'submitted') navigate(`/white-test/${certId}/result`, { replace: true })
      else onNext()
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Please select an answer to continue.')
    }
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit(selected)
  }

  return (
    <div className="course-page section">
      <div className="container">
        <div className="wt-header">
          <span className="wt-counter">Question {view.index + 1} / {view.total}</span>
          {/* Remaining time comes from the server's startedAt, so a reload keeps counting down. */}
          <Countdown seconds={view.remainingSeconds} onExpire={() => void submit(selected)} />
        </div>

        {postError && <div className="form-notice is-error" style={{ marginBottom: 12 }}>{postError}</div>}
        <form id="wtForm" onSubmit={onSubmit}>
          <div className="wt-card">
            <div className="wt-question">{view.question}</div>
            <div className="wt-choices">
              {(Object.entries(view.choices) as [Choice, string][]).map(([letter, text]) => (
                <label key={letter} className={`wt-choice${selected === letter ? ' is-selected' : ''}`}>
                  <input type="radio" name="answer" value={letter} checked={selected === letter} onChange={() => setSelected(letter)} />
                  <span><strong>{letter})</strong> {text}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="wt-submit-row">
            {isLast ? (
              <button type="submit" className="wt-btn wt-btn--commit" disabled={busy}>Submit answers</button>
            ) : (
              <button type="submit" className="wt-btn wt-btn--primary" disabled={busy}>
                <span>Next</span>
                <span className="wt-btn-arrow" aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function Countdown({ seconds, onExpire }: { seconds: number; onExpire(): void }) {
  const [left, setLeft] = useState(Math.max(0, seconds))
  const expire = useRef(onExpire)
  const fired = useRef(false)

  useEffect(() => { expire.current = onExpire })

  // Derive the time left from a fixed deadline rather than counting ticks:
  // browsers slow timers down in background tabs, and a tick counter drifts.
  useEffect(() => {
    const deadline = Date.now() + Math.max(0, seconds) * 1000
    const update = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    const id = window.setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [seconds])

  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true
      expire.current()
    }
  }, [left])

  return <span className="wt-timer" id="wtTimer">{pad2(Math.floor(left / 60))}:{pad2(left % 60)}</span>
}
