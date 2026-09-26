import { db, save } from './db'
import { ApiError } from './errors'
import { QUESTION_BANKS } from './fixtures'
import { findCert, findEnrolment } from './queries'
import type { Certification, Choice, WhiteTestState } from './types'
import { delay, requireRole } from './util'

export const TIME_LIMIT_SECONDS = 600
export const PASS_PCT = 70

export interface WhiteTestIntro { certification: Certification; questionCount: number; available: boolean }

/** 404 unknown cert; 403 not enrolled or progress < 100 (page redirects to the course, as v1). */
export async function getIntro(certId: number): Promise<WhiteTestIntro> {
  await delay()
  const user = requireRole('student')
  const cert = findCert(certId)
  if (!cert) throw new ApiError(404, 'Certification not found.')
  const enrolment = findEnrolment(user.id, certId)
  if (!enrolment || enrolment.progress < 100) throw new ApiError(403, 'Finish every video to unlock the white test.')
  const bank = QUESTION_BANKS[cert.code] ?? []
  return { certification: cert, questionCount: bank.length, available: bank.length > 0 }
}

function stateFor(userId: number): WhiteTestState | undefined {
  return db().tables.whiteTests.find(w => w.userId === userId)
}

/** Always a fresh test (overwrites the previous one), as v1. */
export async function start(certId: number): Promise<void> {
  const intro = await getIntro(certId)
  if (!intro.available) throw new ApiError(400, 'No white test available yet.')
  const user = requireRole('student')
  const t = db().tables
  t.whiteTests = t.whiteTests.filter(w => w.userId !== user.id)
  t.whiteTests.push({
    userId: user.id, certId, certCode: intro.certification.code, startedAt: Date.now(),
    currentQ: 0, answers: Array<Choice | null>(intro.questionCount).fill(null), submitted: false,
  })
  save()
}

export type TakeView =
  | { status: 'none' }
  | { status: 'submitted' }
  | { status: 'question'; index: number; total: number; question: string; choices: Record<Choice, string>; selected: Choice | null; remainingSeconds: number }

const remaining = (w: WhiteTestState): number => TIME_LIMIT_SECONDS - Math.floor((Date.now() - w.startedAt) / 1000)

/** Order as v1: no test → none; submitted → submitted; timed out → submit. */
export async function current(certId: number): Promise<TakeView> {
  await delay()
  const user = requireRole('student')
  const w = stateFor(user.id)
  if (!w || w.certId !== certId) return { status: 'none' }
  if (w.submitted) return { status: 'submitted' }
  if (remaining(w) <= 0) {
    w.submitted = true
    save()
    return { status: 'submitted' }
  }
  const bank = QUESTION_BANKS[w.certCode]
  const q = bank[w.currentQ]
  return { status: 'question', index: w.currentQ, total: bank.length, question: q.question, choices: q.choices, selected: w.answers[w.currentQ], remainingSeconds: remaining(w) }
}

/** Timeout is checked before the answer (a timed-out answer is not stored), as v1. */
export async function answer(certId: number, choice: Choice | null): Promise<'next' | 'submitted'> {
  await delay()
  const user = requireRole('student')
  const w = stateFor(user.id)
  if (!w || w.certId !== certId) throw new ApiError(404, 'No white test in progress.')
  if (w.submitted) return 'submitted'
  if (remaining(w) <= 0) {
    w.submitted = true
    save()
    return 'submitted'
  }
  if (choice === null) throw new ApiError(400, 'Please select an answer to continue.')
  w.answers[w.currentQ] = choice
  if (w.currentQ === QUESTION_BANKS[w.certCode].length - 1) w.submitted = true
  else w.currentQ += 1
  save()
  return w.submitted ? 'submitted' : 'next'
}

export interface ResultItem { question: string; choices: Record<Choice, string>; userAnswer: Choice | null; correctAnswer: Choice; isCorrect: boolean }
export interface ResultView { certification: Certification; correct: number; total: number; pct: number; passed: boolean; items: ResultItem[] }

/** null → no submitted test for this cert (page redirects to the intro). Nothing is persisted, as v1. */
export async function result(certId: number): Promise<ResultView | null> {
  await delay()
  const user = requireRole('student')
  const w = stateFor(user.id)
  if (!w || w.certId !== certId || !w.submitted) return null
  const cert = findCert(certId)
  if (!cert) throw new ApiError(404, 'Certification not found.')
  const items = QUESTION_BANKS[w.certCode].map((q, i) => {
    const userAnswer = w.answers[i] ?? null
    return { question: q.question, choices: q.choices, userAnswer, correctAnswer: q.answer, isCorrect: userAnswer === q.answer }
  })
  const correct = items.filter(i => i.isCorrect).length
  const pct = items.length > 0 ? Math.round((100 * correct) / items.length) : 0
  return { certification: cert, correct, total: items.length, pct, passed: pct >= PASS_PCT, items }
}
