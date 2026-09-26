# Frontend Migration (v1 PHP → React) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every in-scope v1 page as a React + Vite + TypeScript SPA in `Project_v2/frontend/`, looking like v1 and backed by a typed, `localStorage`-persisted mock API that can later be swapped for Django REST calls.

**Architecture:** Pages → hooks (`useAsync`, `useAuth`) → `src/api/*` async functions → in-memory store (`src/api/db.ts`) saved to `localStorage`. v1 CSS/fonts/images are served unchanged from `public/` and linked in `index.html`. Template jQuery behaviour (menu, sticky header, preloader, carousel, modals, WOW) is re-implemented as small React components.

**Tech Stack:** Vite (`react-ts` template), React 19, TypeScript (strict), React Router 7 (`react-router-dom`), ESLint (template config). Node 22 / npm 10 are installed.

**Spec:** `Project_v2/docs/superpowers/specs/2026-09-26-frontend-migration-design.md`
**Behaviour reference (exact strings, markup line ranges, rules):** `Project_v2/docs/superpowers/plans/2026-09-26-v1-inventory.md` — cited below as **INV §x**. v1 source is `Project/` (read-only; never modify it).

## Global Constraints

- App lives in `Project_v2/frontend/`. All commands in this plan run from that folder unless stated.
- Git: work on branch `frontend-migration` in the `Project_v2` repository (already checked out). One commit per task.
- No runtime dependencies besides `react`, `react-dom`, `react-router-dom`. No jQuery, Bootstrap JS, owl, WOW, TanStack Query, Tailwind, MUI.
- No automated tests in this step (decided with the user). Each task is verified by `npm run build` (runs `tsc -b` then `vite build`), `npm run lint` (must report **0 errors**; fix warnings you introduce too), and the manual browser check listed in the task.
- Pages never import `src/api/db.ts`, `src/api/fixtures.ts` or touch `localStorage`; they import only from `src/api` (the `index.ts` barrel).
- Every visible string (headings, labels, buttons, flash/validation messages) is copied **verbatim** from v1 via INV. HTML entities (`&mdash;`, `&rarr;`, `&middot;`, `&amp;`, `&nbsp;`) are valid in JSX text and may be kept as-is.
- Image upload limit is **1 MB** (spec §8): messages say `max 1 MB` wherever v1 says `max 5 MB`.
- Demo accounts: `user1@tek-up.de` / `123456789`, `user2@tek-up.de` / `123456789` (students, from `tekup.sql`), `admin@tek-up.de` / `admin123` (admin, demo-only replacement for v1's hard-coded `admin@admin`).
- Dev server: `npm run dev` (Vite default port 5173). Do **not** use port 8080 (blocked on this machine).
- TypeScript: the template enables `verbatimModuleSyntax` and `erasableSyntaxOnly` → use `import type` for type-only imports; no `enum`, no constructor parameter properties.

### PHP → JSX conversion rules (apply in every page task)

1. `class=` → `className=`, `for=` → `htmlFor=`, void tags self-close (`<img />`, `<input />`, `<br />`), `style="a: b"` → `style={{ a: 'b' }}`, `tabindex` → `tabIndex`, `autocomplete` → `autoComplete`, `aria-*`/`data-*` stay.
2. `<?= htmlspecialchars($x) ?>` → `{x}`; PHP `if/foreach` → `&&` / `.map()` with a `key`.
3. Links: `href="x.php..."` → `<Link to="...">` using the route table in Task 5. `href="#"` placeholders stay as `<a href="#" onClick={e => e.preventDefault()}>`.
4. `data-bs-toggle="modal"` / `data-bs-dismiss` → React state + `<Modal>` (Task 5). `data-bs-ride` carousel → `<Carousel>` (Task 6).
5. Elements with class `wow <animation>` and `data-wow-duration`/`data-wow-delay` → spread `wow('<animation>', duration, delay)` from `src/lib/wow.ts` (Task 5) and keep the other classes: `<div {...wow('fadeInLeft', '1s', '0.2s', 'col-lg-6')}>`.
6. `<form method="post">` → `<form onSubmit={handler}>` with `e.preventDefault()`; the handler calls the API; PRG redirects become `navigate()` or local state as noted per page.
7. `confirm('...')` → a `<ConfirmModal>` (Task 5) with the same text (browser dialogs are not used).
8. Page `<title>` → `usePageTitle('...')` (Task 5) with the v1 title.

## Review Focus

1. **Corrupt / old `localStorage` data** (hand-edited, older version, private mode throwing) → app must reseed and still start; never a white screen. Pinned by Task 2 step "store self-check".
2. **Deep link / refresh on a protected or parameterised route** (`/course/9999`, `/course/abc`, `/admin` as student, `/dashboard` logged out) → correct redirect (catalog / certifications / role home / login), never a crash. Pinned by Task 5 and Task 8 manual checks.
3. **Storage quota exceeded on image upload** (several ~1 MB images) → a clear error message, and the in-memory state rolls back so the next reload is consistent. Pinned by Task 2 (`save()` rollback) and Task 13 check.
4. **White test timer expiry / reload mid-test** → timeout submits and lands on the result; reloading `/take` continues the same question with the remaining time (computed from `startedAt`), not a fresh timer. Pinned by Task 9 checks.
5. **Double submission** (double-click Enroll / Request voucher / Approve) → buttons disabled while the request is in flight; mock operations are idempotent. Pinned by the `busy` state in Tasks 7, 10, 12.

## Known v1 bugs: decisions

| v1 behaviour (INV) | v2 decision |
|---|---|
| `admin@admin`/`admin` synthetic login (§0) | Seeded admin user `admin@tek-up.de` (spec §7) |
| Voucher approve password hard-coded `admin` (§admin-vouchers) | Re-enter **the logged-in admin's own password** |
| "Request again" on a rejected voucher is a no-op (§final-exams) | Sets the request back to `pending` |
| Profile "Certifications earned" hard-coded `0` | Count of the user's `earned` enrolments |
| admin-news garbled date (§0) | Format `26 Sep 2026 · 14:05` |
| PCEP white test crashes (§white-test) | "No white test available yet" (spec §8) |
| Sticky header wipes `background-header` on inner pages (§4) | Header always solid except on `/` |
| Admin can open student pages | Student routes require role `student`; admin is sent to `/admin` |
| `confirm()` dialogs | `<ConfirmModal>` with the same text |
| Everything else (3 enrollable certs, no PRG on some pages, 10-min timer, pass ≥70 %…) | Kept as in v1 |

## File Structure

```
Project_v2/frontend/
  index.html                         links v1 CSS (+ Poppins), mounts #root
  public/assets/css/                 bootstrap.min.css, fontawesome.css,
                                     templatemo-space-dynamic.css, animated.css (copied)
  public/assets/fonts/               copied from Project/assets/fonts
  public/assets/images/              copied from Project/assets/images (news/, partners/…)
  public/media/README.txt            how to drop sample videos for the player
  README.md                          run, demo accounts, mock API notes
  src/main.tsx                       createRoot + <App/>
  src/App.tsx                        <AuthProvider> + <RouterProvider>
  src/router.tsx                     route table
  src/app.css                        tiny additions (modal overlay, carousel, 404) – only if needed
  src/api/types.ts                   domain types (mirror tekup.sql)
  src/api/errors.ts                  ApiError, isApiError
  src/api/fixtures.ts                seed(): DbState
  src/api/db.ts                      store: db(), save(), nextId(), resetDemoData()
  src/api/util.ts                    delay, sessionUser, requireRole, EMAIL_RE, readFileAsDataUrl
  src/api/queries.ts                 shared reads: catalog order, featured ids, enrolment, progress recompute
  src/api/auth.ts  certifications.ts  courses.ts  progress.ts  whiteTest.ts
  src/api/vouchers.ts  messages.ts  news.ts  profile.ts  stats.ts
  src/api/index.ts                   barrel: namespaces + types
  src/lib/format.ts                  date formats, studentId, pad2, plural
  src/lib/wow.ts                     wow() className/style helper
  src/hooks/useAsync.ts              data loading hook
  src/hooks/usePageTitle.ts
  src/auth/context.ts                AuthContext object + AuthValue type
  src/auth/AuthProvider.tsx          provider component
  src/auth/useAuth.ts                hook
  src/auth/RequireRole.tsx           route guard + homeFor()
  src/components/Header.tsx          3 nav variants, menu toggle, sticky logic
  src/components/Footer.tsx          v1 footer + "Reset demo data"
  src/components/Preloader.tsx
  src/components/Modal.tsx           Bootstrap-markup modal driven by state
  src/components/ConfirmModal.tsx
  src/components/Notice.tsx          .form-notice and .fe-flash renderers
  src/components/Loading.tsx         loading + error blocks
  src/components/Carousel.tsx        news carousel (Bootstrap markup)
  src/components/ScrollToHash.tsx    /#section scrolling
  src/layouts/PublicLayout.tsx  PortalLayout.tsx  AdminLayout.tsx  ContactLayout.tsx
  src/pages/public/Home.tsx  Contact.tsx  Login.tsx
  src/pages/portal/Dashboard.tsx  Catalog.tsx  Certifications.tsx  Course.tsx
  src/pages/portal/WhiteTestIntro.tsx  WhiteTestTake.tsx  WhiteTestResult.tsx
  src/pages/portal/FinalExams.tsx  Profile.tsx
  src/pages/admin/AdminDashboard.tsx  AdminVouchers.tsx  AdminMessages.tsx
  src/pages/admin/AdminMessage.tsx  AdminNews.tsx  AdminStats.tsx
  src/pages/NotFound.tsx
```

Refinement of spec §5: CSS is linked from `public/assets/css` in `index.html` (not imported in `main.tsx`) because v1 CSS uses relative `url(../fonts/…)` and `url(../images/…)` paths that only resolve if the v1 folder layout is kept. The effect is the same: loaded once, unchanged.

---

### Task 1: Scaffold the Vite app and copy v1 assets

**Files:**
- Create: `frontend/` (Vite template), `frontend/public/assets/**`, `frontend/public/media/README.txt`
- Modify: `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
- Delete: `frontend/src/App.css`, `frontend/src/index.css`, `frontend/src/assets/react.svg`, `frontend/public/vite.svg` (template demo files)

**Interfaces:**
- Produces: a building app whose `index.html` loads the v1 stylesheets.

- [ ] **Step 1: Scaffold** (run in `Project_v2/`; the `frontend` folder exists and is empty)

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom
```

If the CLI asks whether to overwrite/ignore files in the empty folder, choose to continue.

- [ ] **Step 2: Copy v1 assets** (run in `Project_v2/frontend`)

```bash
mkdir -p public/assets/css public/assets/fonts public/assets/images public/media
cp ../../Project/vendor/bootstrap/css/bootstrap.min.css public/assets/css/
cp ../../Project/assets/css/fontawesome.css ../../Project/assets/css/templatemo-space-dynamic.css ../../Project/assets/css/animated.css public/assets/css/
cp -r ../../Project/assets/fonts/. public/assets/fonts/
cp -r ../../Project/assets/images/. public/assets/images/
rm -f src/App.css src/index.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 3: Write `public/media/README.txt`**

```text
Course videos are not bundled. The course player requests
/media/<cert media path>/<section folder>/<file>, e.g.
/media/pcap/01-introduction/01-welcome.mp4 (+ .vtt subtitles).
Drop sample files here with those paths to test playback.
```

- [ ] **Step 4: Replace `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="description" content="TEK-UP Certified Students portal." />
    <meta name="author" content="TEK-UP University" />
    <link rel="icon" type="image/png" href="/assets/images/logo1.png" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
    <link rel="stylesheet" href="/assets/css/fontawesome.css" />
    <link rel="stylesheet" href="/assets/css/templatemo-space-dynamic.css" />
    <link rel="stylesheet" href="/assets/css/animated.css" />
    <title>TEK-UP Certified Students</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Replace `src/main.tsx` and `src/App.tsx` with a placeholder**

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

```tsx
// src/App.tsx
export default function App() {
  return <div className="container"><h2>TEK-UP <em>v2</em></h2></div>
}
```

- [ ] **Step 6: Verify**

Run: `npm run build` → exits 0. `npm run lint` → 0 errors.
Run: `npm run dev`, open `http://localhost:5173` → Poppins heading styled by the template (purple `<em>`), no 404s for CSS/fonts in the network tab. Stop the server.

- [ ] **Step 7: Commit** (from `Project_v2/`)

```bash
git add frontend
git commit -m "feat(frontend): scaffold Vite React TS app with v1 assets"
```

Check `frontend/.gitignore` from the template ignores `node_modules` and `dist` before committing.

---

### Task 2: Mock data layer – types, errors, fixtures, store

**Files:**
- Create: `src/api/types.ts`, `src/api/errors.ts`, `src/api/fixtures.ts`, `src/api/db.ts`, `src/api/util.ts`, `src/lib/format.ts`

**Interfaces:**
- Produces (used by every API module):
  - `db(): DbState`, `save(): void` (throws `ApiError(507)` and rolls back on quota errors), `nextId(table: TableName): number`, `resetDemoData(): void`
  - `ApiError` (`status: number`, `message: string`), `isApiError(e: unknown, status?: number): e is ApiError`
  - `delay(ms?: number): Promise<void>`, `sessionUser(): User | null`, `requireUser(): User`, `requireRole(role: Role): User`, `toPublic(u: User): PublicUser`, `EMAIL_RE`, `readFileAsDataUrl(file: File): Promise<string>`, `nowIso(): string`
  - `formatDate`, `formatDateTime`, `formatDateAt`, `formatDateDot`, `pad2`, `studentId`, `plural`

- [ ] **Step 1: Write `src/api/types.ts`**

```ts
export type Role = 'student' | 'admin'
export type Category = 'technical' | 'linguistic' | 'other'
export type EnrolmentStatus = 'in_progress' | 'earned'
export type VoucherStatus = 'pending' | 'approved' | 'rejected'
export type MessageStatus = 'unread' | 'read'
export type Choice = 'A' | 'B' | 'C' | 'D'

export interface User {
  id: number
  email: string
  password: string // mock only, plain text like v1
  firstname: string | null
  lastname: string | null
  role: Role
  createdAt: string // ISO
}
export type PublicUser = Omit<User, 'password'>

export interface Profile {
  userId: number
  phone: string | null
  address: string | null
  photo: string | null // data URL
  updatedAt: string
}

export interface Certification {
  id: number
  code: string
  name: string
  provider: string
  category: Category
  description: string | null
  mediaPath: string | null
}

export interface UserCertification {
  id: number
  userId: number
  certificationId: number
  status: EnrolmentStatus
  progress: number // 0..100
  enrolledAt: string
  earnedAt: string | null
}

export interface CourseSection {
  id: number
  certificationId: number
  position: number
  title: string
  folder: string
}

export interface CourseVideo {
  id: number
  sectionId: number
  position: number
  title: string
  filename: string
  subtitleFilename: string | null
  durationSeconds: number | null
}

export interface VideoProgress {
  userId: number
  videoId: number
  watchedAt: string
}

export interface VoucherRequest {
  id: number
  userId: number
  certificationId: number
  status: VoucherStatus
  requestedAt: string
}

export interface ContactMessage {
  id: number
  name: string
  surname: string
  email: string
  message: string
  status: MessageStatus
  submittedAt: string
}

export interface NewsImage {
  id: number
  name: string
  url: string // /assets/images/news/... or a data URL
  sizeBytes: number
  uploadedAt: string
}

export interface Question {
  question: string
  choices: Record<Choice, string>
  answer: Choice
}

export interface WhiteTestState {
  userId: number
  certId: number
  certCode: string
  startedAt: number // epoch ms
  currentQ: number // 0-based
  answers: (Choice | null)[]
  submitted: boolean
}

export interface Tables {
  users: User[]
  profiles: Profile[]
  certifications: Certification[]
  userCertifications: UserCertification[]
  courseSections: CourseSection[]
  courseVideos: CourseVideo[]
  videoProgress: VideoProgress[]
  voucherRequests: VoucherRequest[]
  contactMessages: ContactMessage[]
  news: NewsImage[]
  whiteTests: WhiteTestState[]
}
export type TableName = keyof Tables

export interface DbState {
  version: number
  sessionUserId: number | null
  tables: Tables
}
```

- [ ] **Step 2: Write `src/api/errors.ts`**

```ts
export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isApiError(e: unknown, status?: number): e is ApiError {
  return e instanceof ApiError && (status === undefined || e.status === status)
}
```

- [ ] **Step 3: Write `src/lib/format.ts`**

```ts
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const pad2 = (n: number): string => String(n).padStart(2, '0')

function parts(iso: string) {
  const d = new Date(iso)
  return { day: pad2(d.getDate()), mon: MONTHS[d.getMonth()], year: d.getFullYear(), time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` }
}
/** PHP `d M Y` → 26 Sep 2026 */
export function formatDate(iso: string): string {
  const p = parts(iso)
  return `${p.day} ${p.mon} ${p.year}`
}
/** PHP `d M Y, H:i` → 26 Sep 2026, 14:05 */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${parts(iso).time}`
}
/** PHP `d M Y \a\t H:i` → 26 Sep 2026 at 14:05 */
export function formatDateAt(iso: string): string {
  return `${formatDate(iso)} at ${parts(iso).time}`
}
/** intended v1 admin-news format → 26 Sep 2026 · 14:05 */
export function formatDateDot(iso: string): string {
  return `${formatDate(iso)} · ${parts(iso).time}`
}
/** TU-00001 */
export const studentId = (id: number): string => `TU-${String(id).padStart(5, '0')}`
/** v1 rule: plural "s" omitted only when n === 1 */
export const plural = (n: number): string => (n === 1 ? '' : 's')
```

- [ ] **Step 4: Write `src/api/fixtures.ts`**

`seed()` must build **new** objects every call (it is also used by `resetDemoData`). The certification rows are the 40 rows of `Project/database/tekup.sql` lines 75–114 in the same order (ids 1..40). `mediaPath` is `'pcep'` for PCEP (id 26), `'pcap'` for PCAP (id 27), `null` for all others.

Demo additions (not in `tekup.sql`, needed so pages have something to show — v1 filled these via `import-course.php` and manual use): course content for PCEP and PCAP, user1 enrolled in PCAP at 33 %, user2 enrolled in PCAP at 100 %, one unread contact message.

```ts
import type { Certification, CourseSection, CourseVideo, DbState, NewsImage, Question, Choice } from './types'

export const DB_VERSION = 1

// 40 rows from tekup.sql lines 75-114, same order → ids 1..40.
const CERT_ROWS: [code: string, name: string, provider: string, category: Certification['category'], description: string][] = [
  ['CCNA', 'CCNA — Networking Associate', 'Cisco', 'technical', 'Routing, switching, network fundamentals and security basics.'],
  ['CCNP', 'CCNP — Networking Professional', 'Cisco', 'technical', 'Enterprise networking, advanced routing and infrastructure.'],
  ['CCIE', 'CCIE — Networking Expert', 'Cisco', 'technical', 'Expert-level networking certification with hands-on lab exam.'],
  ['AWS-CLF', 'AWS Cloud Practitioner', 'Amazon AWS', 'technical', 'Foundational AWS Cloud concepts and services.'],
  ['AWS-SAA', 'AWS Solutions Architect — Associate', 'Amazon AWS', 'technical', 'Design distributed systems on AWS at associate level.'],
  ['AWS-SAP', 'AWS Solutions Architect — Professional', 'Amazon AWS', 'technical', 'Design and deploy large-scale, fault-tolerant systems on AWS.'],
  ['AWS-DVA', 'AWS Developer — Associate', 'Amazon AWS', 'technical', 'Develop, deploy and debug cloud-based applications on AWS.'],
  ['CEH', 'CEH — Certified Ethical Hacker', 'EC-Council', 'technical', 'Tools and methods of ethical hacking, real-world labs.'],
  ['CHFI', 'CHFI — Hacking Forensic Investigator', 'EC-Council', 'technical', 'Digital forensics, investigation and incident response.'],
  ['CND', 'CND — Certified Network Defender', 'EC-Council', 'technical', 'Defensive network security operations.'],
  ['RHCSA-EX200', 'RHCSA (EX-200)', 'Red Hat', 'technical', 'Red Hat Certified System Administrator.'],
  ['RHCE-EX294', 'RHCE (EX-294)', 'Red Hat', 'technical', 'Red Hat Certified Engineer with Ansible automation.'],
  ['RHCS-EX447', 'RHCS Ansible Best Practices (EX-447)', 'Red Hat', 'technical', 'Advanced Ansible automation with Red Hat.'],
  ['RHCS-EX358', 'RHCS Services Management (EX-358)', 'Red Hat', 'technical', 'Network services on Red Hat Enterprise Linux.'],
  ['eWPT', 'eWPT — Web Penetration Tester', 'INE', 'technical', 'Web application penetration testing certification.'],
  ['eCPPT', 'eCPPT — Professional Penetration Tester', 'INE', 'technical', 'Hands-on professional penetration tester certification.'],
  ['eMAPT', 'eMAPT — Mobile App Penetration Tester', 'INE', 'technical', 'Mobile application penetration testing.'],
  ['eSOC', 'eSOC — SOC Analyst', 'INE', 'technical', 'Security Operations Center analyst certification.'],
  ['HCIA', 'HCIA — ICT Associate', 'Huawei', 'technical', 'Huawei Certified ICT Associate.'],
  ['HCIP', 'HCIP — ICT Professional', 'Huawei', 'technical', 'Huawei Certified ICT Professional.'],
  ['HCIE', 'HCIE — ICT Expert', 'Huawei', 'technical', 'Huawei Certified ICT Expert.'],
  ['OCA-JAVA', 'Oracle Java — Associate (OCA)', 'Oracle', 'technical', 'Oracle Certified Associate in Java SE.'],
  ['OCP-JAVA', 'Oracle Java — Professional (OCP)', 'Oracle', 'technical', 'Oracle Certified Professional in Java SE.'],
  ['OCA-DB', 'Oracle Database — Associate', 'Oracle', 'technical', 'Oracle Database Administration at associate level.'],
  ['OCP-DB', 'Oracle Database — Professional', 'Oracle', 'technical', 'Oracle Database Administration at professional level.'],
  ['PCEP', 'PCEP — Entry-Level Python', 'Python Institute', 'technical', 'Entry-level Python programming certification.'],
  ['PCAP', 'PCAP — Associate Python Programmer', 'Python Institute', 'technical', 'Associate-level Python programming certification.'],
  ['PCPP', 'PCPP — Professional Python Programmer', 'Python Institute', 'technical', 'Professional-level Python programming certification.'],
  ['MS-ITS', 'Microsoft IT Specialist', 'Microsoft', 'technical', 'Foundational Microsoft IT Specialist track.'],
  ['AZ-900', 'Azure Fundamentals (AZ-900)', 'Microsoft', 'technical', 'Foundational knowledge of Microsoft Azure services.'],
  ['LFCS', 'LFCS — Linux Foundation Certified SysAdmin', 'Linux Foundation', 'technical', 'Linux Foundation Certified System Administrator.'],
  ['OSCP', 'OSCP — Penetration Tester', 'Offensive Security', 'technical', 'Hands-on offensive security certification.'],
  ['IELTS', 'IELTS — English Proficiency', 'British Council', 'linguistic', 'International English Language Testing System.'],
  ['GOETHE-B1', 'Goethe-Zertifikat B1 — German', 'Goethe-Institut', 'linguistic', 'German language certification at B1 level.'],
  ['DELF-B1', 'DELF B1 — French', 'France Éducation', 'linguistic', 'French language certification at B1 level.'],
  ['NSE-4', 'NSE 4 — Network Security Professional', 'Fortinet', 'other', 'Fortinet Network Security Professional certification.'],
  ['PECB-27001', 'ISO 27001 Lead Auditor', 'PECB', 'other', 'Information security management system lead auditor.'],
  ['VCP-DCV', 'VCP-DCV — Data Center Virtualization', 'VMware', 'other', 'VMware Certified Professional, Data Center Virtualization.'],
  ['NVIDIA-CUDA', 'CUDA Developer', 'NVIDIA', 'other', 'NVIDIA CUDA programming and parallel acceleration.'],
  ['ISTQB-FL', 'ISTQB Foundation Level', 'ISTQB', 'other', 'Software testing foundation certification.'],
]

const MEDIA: Record<string, string> = { PCEP: 'pcep', PCAP: 'pcap' }

// [certCode, section title, folder, videos[title, file base, duration s]]
const COURSES: [string, string, string, [string, string, number][]][] = [
  ['PCEP', 'Getting started', '01-getting-started', [['Welcome to PCEP', '01-welcome', 312], ['Installing Python', '02-installing-python', 428]]],
  ['PCEP', 'Python basics', '02-python-basics', [['Variables and types', '01-variables', 655], ['Operators', '02-operators', 540]]],
  ['PCAP', 'Introduction', '01-introduction', [['Welcome to PCAP', '01-welcome', 295], ['Setting up your environment', '02-setup', 470]]],
  ['PCAP', 'Data types', '02-data-types', [['Numbers and strings', '01-numbers-strings', 720], ['Lists and tuples', '02-lists-tuples', 810]]],
  ['PCAP', 'Functions and modules', '03-functions', [['Defining functions', '01-functions', 760], ['Modules and packages', '02-modules', 690]]],
]

// Project/assets/images/news, sizes in bytes; newest first by index.
const NEWS_FILES: [string, number][] = [
  ['700124739_995522152822660_533561874467326606_n.jpg', 696606],
  ['699650890_995721799469362_1160164391028259687_n.jpg', 694653],
  ['699010975_995634766144732_1431707900303520702_n.jpg', 682347],
  ['697777723_994993622875513_1659045749949871843_n.jpg', 682163],
  ['697062056_994948136213395_1839914564616004790_n.jpg', 682953],
  ['696881521_995729302801945_3557291500901662285_n.jpg', 690620],
  ['696282146_994934239548118_4800355187093740467_n.jpg', 687169],
  ['696126321_995625282812347_2742271832016498348_n.jpg', 690891],
]

const q = (question: string, a: string, b: string, c: string, d: string, answer: Choice): Question =>
  ({ question, choices: { A: a, B: b, C: c, D: d }, answer })

/** INV §3, verbatim. Keyed by certification code. */
export const QUESTION_BANKS: Record<string, Question[]> = {
  PCAP: [
    q('What is the correct way to print "Hello" in Python?', 'echo("Hello")', 'print("Hello")', 'printf("Hello")', 'show("Hello")', 'B'),
    q('Which symbol is used for comments in Python?', '//', '<!-- -->', '#', '**', 'C'),
    q('What is the result of 2 + 3 in Python?', '5', '23', '6', 'Error', 'A'),
    q('Which data type is used for text in Python?', 'int', 'float', 'str', 'bool', 'C'),
    q('Which keyword is used to create a function in Python?', 'func', 'define', 'function', 'def', 'D'),
  ],
}

const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString()

export function seed(): DbState {
  const certifications: Certification[] = CERT_ROWS.map(([code, name, provider, category, description], i) => ({
    id: i + 1, code, name, provider, category, description, mediaPath: MEDIA[code] ?? null,
  }))
  const certId = (code: string): number => certifications.find(c => c.code === code)!.id

  const courseSections: CourseSection[] = []
  const courseVideos: CourseVideo[] = []
  const positionByCert: Record<string, number> = {}
  for (const [code, title, folder, videos] of COURSES) {
    const position = (positionByCert[code] = (positionByCert[code] ?? 0) + 1)
    const section: CourseSection = { id: courseSections.length + 1, certificationId: certId(code), position, title, folder }
    courseSections.push(section)
    videos.forEach(([vTitle, base, duration], i) => {
      courseVideos.push({
        id: courseVideos.length + 1, sectionId: section.id, position: i + 1, title: vTitle,
        filename: `${base}.mp4`, subtitleFilename: `${base}.vtt`, durationSeconds: duration,
      })
    })
  }
  const pcapVideoIds = courseVideos
    .filter(v => courseSections.find(s => s.id === v.sectionId)!.certificationId === certId('PCAP'))
    .map(v => v.id)

  const news: NewsImage[] = NEWS_FILES.map(([name, sizeBytes], i) => ({
    id: i + 1, name, url: `/assets/images/news/${encodeURIComponent(name)}`, sizeBytes, uploadedAt: daysAgo(i * 3 + 1),
  }))

  return {
    version: DB_VERSION,
    sessionUserId: null,
    tables: {
      users: [
        { id: 1, email: 'user1@tek-up.de', password: '123456789', firstname: 'User', lastname: 'One', role: 'student', createdAt: daysAgo(120) },
        { id: 2, email: 'user2@tek-up.de', password: '123456789', firstname: 'User', lastname: 'Two', role: 'student', createdAt: daysAgo(90) },
        { id: 3, email: 'admin@tek-up.de', password: 'admin123', firstname: 'Administrator', lastname: null, role: 'admin', createdAt: daysAgo(200) },
      ],
      profiles: [
        { userId: 1, phone: null, address: null, photo: null, updatedAt: daysAgo(120) },
        { userId: 2, phone: null, address: null, photo: null, updatedAt: daysAgo(90) },
      ],
      certifications,
      userCertifications: [
        { id: 1, userId: 1, certificationId: certId('PCAP'), status: 'in_progress', progress: 33, enrolledAt: daysAgo(10), earnedAt: null },
        { id: 2, userId: 2, certificationId: certId('PCAP'), status: 'in_progress', progress: 100, enrolledAt: daysAgo(30), earnedAt: null },
      ],
      courseSections,
      courseVideos,
      videoProgress: [
        ...pcapVideoIds.slice(0, 2).map(videoId => ({ userId: 1, videoId, watchedAt: daysAgo(5) })),
        ...pcapVideoIds.map(videoId => ({ userId: 2, videoId, watchedAt: daysAgo(3) })),
      ],
      voucherRequests: [],
      contactMessages: [
        { id: 1, name: 'Sarra', surname: 'Ben Ali', email: 'sarra.benali@example.com', message: 'Hello,\nI would like to know when the next PCAP exam session is planned.\nThank you.', status: 'unread', submittedAt: daysAgo(2) },
      ],
      news,
      whiteTests: [],
    },
  }
}
```

- [ ] **Step 5: Write `src/api/db.ts`**

```ts
import { ApiError } from './errors'
import { DB_VERSION, seed } from './fixtures'
import type { DbState, TableName } from './types'

const KEY = 'tekup-v2-mock-db'
let state: DbState | null = null

function isValid(value: unknown): value is DbState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<DbState>
  return v.version === DB_VERSION && typeof v.tables === 'object' && v.tables !== null && Array.isArray(v.tables.users)
}

function readStored(): DbState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null // unreadable / private mode: fall back to seed
  }
}

export function db(): DbState {
  if (!state) {
    state = readStored() ?? seed()
  }
  return state
}

/** Persist. On failure (quota) restore the last saved state and throw. */
export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db()))
  } catch {
    state = readStored() ?? seed()
    throw new ApiError(507, 'Browser storage is full. Remove some uploaded images and try again.')
  }
}

export function nextId(table: TableName): number {
  const rows = db().tables[table] as unknown as { id?: number }[]
  return rows.reduce((max, r) => Math.max(max, r.id ?? 0), 0) + 1
}

export function resetDemoData(): void {
  state = seed()
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage unavailable: keep the in-memory seed
  }
}
```

- [ ] **Step 6: Write `src/api/util.ts`**

```ts
import { db } from './db'
import { ApiError } from './errors'
import type { PublicUser, Role, User } from './types'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const delay = (ms = 150): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
export const nowIso = (): string => new Date().toISOString()

export function toPublic(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = u
  return rest
}

export function sessionUser(): User | null {
  const s = db()
  return s.tables.users.find(u => u.id === s.sessionUserId) ?? null
}

export function requireUser(): User {
  const u = sessionUser()
  if (!u) throw new ApiError(401, 'Please sign in to continue.')
  return u
}

export function requireRole(role: Role): User {
  const u = requireUser()
  if (u.role !== role) throw new ApiError(403, 'You do not have access to this page.')
  return u
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ApiError(400, 'Upload failed. Please try again.'))
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 7: Store self-check (Review Focus 1)**

Temporarily add to `src/App.tsx`:

```tsx
import { db } from './api/db'
console.log('[mock-db]', db().tables.certifications.length, db().tables.courseVideos.length)
```

Run `npm run dev`, open the app, check the console prints `[mock-db] 40 10`. Then in DevTools console run `localStorage.setItem('tekup-v2-mock-db', '{bad json')` and reload → still prints `[mock-db] 40 10`, no error. Run `localStorage.setItem('tekup-v2-mock-db', JSON.stringify({version: 0}))` and reload → same. **Remove the two temporary lines.**

- [ ] **Step 8: Verify and commit**

Run: `npm run build` → 0; `npm run lint` → 0 errors.

```bash
git add frontend/src
git commit -m "feat(frontend): mock data store, types and seed data"
```

---

### Task 3: API modules – auth, certifications, courses, progress, white test

**Files:**
- Create: `src/api/queries.ts`, `src/api/auth.ts`, `src/api/certifications.ts`, `src/api/courses.ts`, `src/api/progress.ts`, `src/api/whiteTest.ts`

**Interfaces:**
- Consumes: Task 2 (`db`, `save`, `nextId`, `ApiError`, util helpers).
- Produces (exact signatures used by pages):
  - `auth.login(email, password): Promise<PublicUser>`, `auth.logout(): Promise<void>`, `auth.currentUser(): Promise<PublicUser | null>`
  - `certifications.listCatalog(): Promise<CatalogGroup[]>`, `certifications.enroll(certId, password): Promise<Flash>`, `certifications.listMine(filter: MyFilter): Promise<MyCertificationsView>`, `certifications.cancel(certId): Promise<Flash>`
  - `courses.getCourse(certId): Promise<CourseView>`
  - `progress.markWatched(videoId): Promise<MarkWatchedResult>`
  - `whiteTest.getIntro(certId): Promise<WhiteTestIntro>`, `whiteTest.start(certId): Promise<void>`, `whiteTest.current(certId): Promise<TakeView>`, `whiteTest.answer(certId, choice: Choice | null): Promise<'next' | 'submitted'>`, `whiteTest.result(certId): Promise<ResultView | null>`
  - `Flash = { type: 'success' | 'error' | 'info'; message: string }`

- [ ] **Step 1: Write `src/api/queries.ts`** (shared reads; not exported from the barrel)

```ts
import { db } from './db'
import type { Category, Certification, CourseVideo, UserCertification } from './types'

const CATEGORY_ORDER: Record<Category, number> = { technical: 0, linguistic: 1, other: 2 }
const pin = (code: string): number => (code === 'PCEP' ? 0 : code === 'PCAP' ? 1 : 2)
const cmp = (a: string, b: string): number => a.localeCompare(b, 'en', { sensitivity: 'base' })

/** INV §0 "Featured / enrollable certs" ordering (MySQL ENUM order, PCEP/PCAP pinned). */
export function orderedCertifications(): Certification[] {
  return [...db().tables.certifications].sort((a, b) =>
    CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || pin(a.code) - pin(b.code) || cmp(a.provider, b.provider) || cmp(a.code, b.code))
}

/** First 3 of the ordered list → PCEP, PCAP, AWS-CLF with seed data. */
export function featuredIds(): number[] {
  return orderedCertifications().slice(0, 3).map(c => c.id)
}

export function findCert(certId: number): Certification | undefined {
  return db().tables.certifications.find(c => c.id === certId)
}

export function findEnrolment(userId: number, certId: number): UserCertification | undefined {
  return db().tables.userCertifications.find(uc => uc.userId === userId && uc.certificationId === certId)
}

export function certVideos(certId: number): CourseVideo[] {
  const { courseSections, courseVideos } = db().tables
  const sections = courseSections.filter(s => s.certificationId === certId).sort((a, b) => a.position - b.position)
  return sections.flatMap(s => courseVideos.filter(v => v.sectionId === s.id).sort((a, b) => a.position - b.position))
}

export function isWatched(userId: number, videoId: number): boolean {
  return db().tables.videoProgress.some(p => p.userId === userId && p.videoId === videoId)
}

/** INV §0: round(100 * watched / total), 0 if no videos. Writes it to the enrolment (caller saves). */
export function recomputeProgress(userId: number, certId: number): number {
  const videos = certVideos(certId)
  const watched = videos.filter(v => isWatched(userId, v.id)).length
  const pct = videos.length === 0 ? 0 : Math.round((100 * watched) / videos.length)
  const enrolment = findEnrolment(userId, certId)
  if (enrolment) enrolment.progress = pct
  return pct
}
```

- [ ] **Step 2: Write `src/api/auth.ts`** (INV §login order; the `admin@admin` shortcut is intentionally gone)

```ts
import { db, save } from './db'
import { ApiError } from './errors'
import type { PublicUser } from './types'
import { delay, EMAIL_RE, sessionUser, toPublic } from './util'

export async function login(email: string, password: string): Promise<PublicUser> {
  await delay()
  const e = email.trim()
  if (e === '' || password === '') throw new ApiError(400, 'Please enter both email and password.')
  if (!EMAIL_RE.test(e)) throw new ApiError(400, 'Please enter a valid email address.')
  const s = db()
  const user = s.tables.users.find(u => u.email.toLowerCase() === e.toLowerCase())
  if (!user || user.password !== password) throw new ApiError(401, 'Invalid email or password.')
  s.sessionUserId = user.id
  save()
  return toPublic(user)
}

export async function logout(): Promise<void> {
  await delay()
  db().sessionUserId = null
  save()
}

export async function currentUser(): Promise<PublicUser | null> {
  await delay(0)
  const u = sessionUser()
  return u ? toPublic(u) : null
}
```

- [ ] **Step 3: Write `src/api/certifications.ts`** (INV §catalog, §certifications)

```ts
import { db, nextId, save } from './db'
import { ApiError } from './errors'
import { featuredIds, findCert, findEnrolment, orderedCertifications } from './queries'
import type { Category, Certification, EnrolmentStatus } from './types'
import { delay, nowIso, requireRole } from './util'

export interface Flash { type: 'success' | 'error' | 'info'; message: string }

export interface CatalogItem extends Certification { enrolled: boolean; featured: boolean }
export interface CatalogGroup { category: Category; label: string; items: CatalogItem[] }

const GROUP_LABELS: Record<Category, string> = {
  technical: 'Technical Certifications',
  linguistic: 'Linguistic Certifications',
  other: 'Other Certifications',
}

export async function listCatalog(): Promise<CatalogGroup[]> {
  await delay()
  const user = requireRole('student')
  const featured = featuredIds()
  const enrolled = new Set(db().tables.userCertifications.filter(uc => uc.userId === user.id).map(uc => uc.certificationId))
  const groups: CatalogGroup[] = (['technical', 'linguistic', 'other'] as Category[]).map(category => ({
    category, label: GROUP_LABELS[category], items: [],
  }))
  for (const c of orderedCertifications()) {
    groups.find(g => g.category === c.category)!.items.push({ ...c, enrolled: enrolled.has(c.id), featured: featured.includes(c.id) })
  }
  return groups.filter(g => g.items.length > 0)
}

/** INV §catalog POST, validation order preserved. Errors are thrown as ApiError(400). */
export async function enroll(certId: number, password: string): Promise<Flash> {
  await delay()
  const user = requireRole('student')
  if (!featuredIds().includes(certId)) throw new ApiError(400, 'That certification is not currently open for enrolment.')
  if (password === '') throw new ApiError(400, 'Please enter your password to confirm the enrolment.')
  if (password !== user.password) throw new ApiError(400, 'Wrong password. Enrolment cancelled.')
  if (!findCert(certId)) throw new ApiError(400, 'That certification could not be found.')
  if (findEnrolment(user.id, certId)) return { type: 'info', message: 'You are already enrolled in that certification.' }
  db().tables.userCertifications.push({
    id: nextId('userCertifications'), userId: user.id, certificationId: certId,
    status: 'in_progress', progress: 0, enrolledAt: nowIso(), earnedAt: null,
  })
  save()
  return { type: 'success', message: 'Enrolled successfully. The certification is now in progress on your dashboard.' }
}

export type MyFilter = 'all' | 'earned' | 'in_progress'

export interface MyCertification {
  certification: Certification
  status: EnrolmentStatus
  progress: number
  enrolledAt: string
  earnedAt: string | null
}

export interface MyCertificationsView {
  items: MyCertification[] // already filtered
  total: number // unfiltered count (drives the empty state)
  earned: number
  inProgress: number
  catalogSize: number
  available: number
}

export async function listMine(filter: MyFilter): Promise<MyCertificationsView> {
  await delay()
  const user = requireRole('student')
  const { userCertifications, certifications } = db().tables
  const all: MyCertification[] = userCertifications
    .filter(uc => uc.userId === user.id)
    .sort((a, b) => (a.status === b.status ? b.enrolledAt.localeCompare(a.enrolledAt) : a.status === 'earned' ? -1 : 1))
    .map(uc => ({
      certification: findCert(uc.certificationId)!,
      status: uc.status, progress: uc.progress, enrolledAt: uc.enrolledAt, earnedAt: uc.earnedAt,
    }))
  const earned = all.filter(c => c.status === 'earned').length
  return {
    items: filter === 'all' ? all : all.filter(c => c.status === filter),
    total: all.length,
    earned,
    inProgress: all.length - earned,
    catalogSize: certifications.length,
    available: Math.max(0, certifications.length - all.length),
  }
}

/** Only in-progress enrolments can be cancelled; watched videos and vouchers stay (as v1). */
export async function cancel(certId: number): Promise<Flash> {
  await delay()
  const user = requireRole('student')
  const t = db().tables
  const index = t.userCertifications.findIndex(uc => uc.userId === user.id && uc.certificationId === certId && uc.status === 'in_progress')
  if (index === -1) throw new ApiError(400, 'That enrolment could not be cancelled.')
  t.userCertifications.splice(index, 1)
  save()
  return { type: 'success', message: 'Enrolment cancelled.' }
}
```

- [ ] **Step 4: Write `src/api/courses.ts`** (INV §course, §stream/subtitle)

```ts
import { db } from './db'
import { ApiError } from './errors'
import { certVideos, findCert, findEnrolment, isWatched } from './queries'
import type { Certification } from './types'
import { delay, requireRole } from './util'

export interface CourseVideoView {
  id: number
  sectionId: number
  title: string
  durationSeconds: number | null
  watched: boolean
  videoUrl: string
  subtitleUrl: string | null
}
export interface CourseSectionView { id: number; position: number; title: string; total: number; watched: number; videos: CourseVideoView[] }
export interface CourseView {
  certification: Certification
  progress: number
  hasContent: boolean
  sections: CourseSectionView[]
  initialVideoId: number | null // first unwatched, else the last video
}

/** 404 unknown cert, 403 not enrolled (page redirects to /catalog, as v1). */
export async function getCourse(certId: number): Promise<CourseView> {
  await delay()
  const user = requireRole('student')
  const cert = findCert(certId)
  if (!cert) throw new ApiError(404, 'Certification not found.')
  const enrolment = findEnrolment(user.id, certId)
  if (!enrolment) throw new ApiError(403, 'You are not enrolled in this certification.')

  const sections = db().tables.courseSections
    .filter(s => s.certificationId === certId)
    .sort((a, b) => a.position - b.position)
    .map(s => {
      const videos = db().tables.courseVideos
        .filter(v => v.sectionId === s.id)
        .sort((a, b) => a.position - b.position)
        .map(v => ({
          id: v.id, sectionId: s.id, title: v.title, durationSeconds: v.durationSeconds,
          watched: isWatched(user.id, v.id),
          videoUrl: `/media/${cert.mediaPath}/${s.folder}/${v.filename}`,
          subtitleUrl: v.subtitleFilename ? `/media/${cert.mediaPath}/${s.folder}/${v.subtitleFilename}` : null,
        }))
      return { id: s.id, position: s.position, title: s.title, total: videos.length, watched: videos.filter(v => v.watched).length, videos }
    })

  const ordered = certVideos(certId)
  const firstUnwatched = ordered.find(v => !isWatched(user.id, v.id))
  return {
    certification: cert,
    progress: enrolment.progress,
    hasContent: Boolean(cert.mediaPath),
    sections,
    initialVideoId: firstUnwatched?.id ?? ordered.at(-1)?.id ?? null,
  }
}
```

- [ ] **Step 5: Write `src/api/progress.ts`** (INV §progress.php)

```ts
import { db, save } from './db'
import { ApiError } from './errors'
import { findEnrolment, isWatched, recomputeProgress } from './queries'
import { delay, nowIso, requireRole } from './util'

export interface MarkWatchedResult { progress: number; section: { id: number; total: number; watched: number } }

export async function markWatched(videoId: number): Promise<MarkWatchedResult> {
  await delay()
  const user = requireRole('student')
  const t = db().tables
  const video = t.courseVideos.find(v => v.id === videoId)
  if (!video) throw new ApiError(404, 'video_not_found')
  const section = t.courseSections.find(s => s.id === video.sectionId)!
  if (!findEnrolment(user.id, section.certificationId)) throw new ApiError(403, 'not_enrolled')
  if (!isWatched(user.id, videoId)) t.videoProgress.push({ userId: user.id, videoId, watchedAt: nowIso() })
  const progress = recomputeProgress(user.id, section.certificationId)
  save()
  const sectionVideos = t.courseVideos.filter(v => v.sectionId === section.id)
  return {
    progress,
    section: { id: section.id, total: sectionVideos.length, watched: sectionVideos.filter(v => isWatched(user.id, v.id)).length },
  }
}
```

- [ ] **Step 6: Write `src/api/whiteTest.ts`** (INV §white-test*, §3)

```ts
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
```

- [ ] **Step 7: Verify and commit**

Run: `npm run build` → 0 (files compile even though nothing imports them yet); `npm run lint` → 0 errors.

```bash
git add frontend/src/api
git commit -m "feat(frontend): mock API for auth, certifications, courses and white test"
```

---

### Task 4: API modules – vouchers, messages, news, profile, stats, barrel

**Files:**
- Create: `src/api/vouchers.ts`, `src/api/messages.ts`, `src/api/news.ts`, `src/api/profile.ts`, `src/api/stats.ts`, `src/api/index.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `vouchers.listReady(): Promise<ReadyCourse[]>`, `vouchers.request(certId): Promise<void>`, `vouchers.listAll(filter: VoucherFilter): Promise<AdminVoucherList>`, `vouchers.setStatus(id, action: VoucherAction, adminPassword?: string): Promise<{ mailto: VoucherMailto | null }>`
  - `messages.send(form: ContactForm): Promise<void>`, `messages.list(filter: MessageFilter): Promise<MessageList>`, `messages.get(id): Promise<ContactMessage>`, `messages.remove(id): Promise<void>`, `messages.markUnread(id): Promise<void>`
  - `news.list(): Promise<NewsImage[]>`, `news.upload(file: File): Promise<string>`, `news.remove(id): Promise<string>`
  - `profile.get(): Promise<ProfileView>`, `profile.update(fields: { phone: string; address: string }): Promise<string>`, `profile.updatePhoto(file: File): Promise<string>`
  - `stats.dashboard(): Promise<StudentDashboard>`, `stats.adminDashboard(): Promise<AdminDashboard>`, `stats.adminStats(): Promise<AdminStats>`
  - `index.ts`: `export * as auth from './auth'` etc., plus `ApiError`, `isApiError`, `resetDemoData`, and all types.
  - Note: refines spec §6 `profile.update(fields, photo?)` into `update` + `updatePhoto` because v1 has two separate forms.

- [ ] **Step 1: Write `src/api/vouchers.ts`** (INV §final-exams, §admin-vouchers)

```ts
import { formatDate } from '../lib/format'
import { db, nextId, save } from './db'
import { ApiError } from './errors'
import { findCert, findEnrolment } from './queries'
import type { Certification, VoucherStatus } from './types'
import { delay, nowIso, requireRole } from './util'

export interface ReadyCourse { certification: Certification; progress: number; voucher: VoucherStatus | null }

export async function listReady(): Promise<ReadyCourse[]> {
  await delay()
  const user = requireRole('student')
  const t = db().tables
  return t.userCertifications
    .filter(uc => uc.userId === user.id && uc.progress >= 100)
    .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))
    .map(uc => ({
      certification: findCert(uc.certificationId)!,
      progress: uc.progress,
      voucher: t.voucherRequests.find(v => v.userId === user.id && v.certificationId === uc.certificationId)?.status ?? null,
    }))
}

/** Eligible = progress ≥ 100. New → pending; rejected → pending (v1 bug fixed); pending/approved unchanged. */
export async function request(certId: number): Promise<void> {
  await delay()
  const user = requireRole('student')
  const enrolment = findEnrolment(user.id, certId)
  if (!enrolment || enrolment.progress < 100) return // v1 silently ignores and still shows the flash
  const t = db().tables
  const existing = t.voucherRequests.find(v => v.userId === user.id && v.certificationId === certId)
  if (!existing) {
    t.voucherRequests.push({ id: nextId('voucherRequests'), userId: user.id, certificationId: certId, status: 'pending', requestedAt: nowIso() })
  } else if (existing.status === 'rejected') {
    existing.status = 'pending'
  }
  save()
}

export type VoucherFilter = 'all' | VoucherStatus
export type VoucherAction = 'approve' | 'reject' | 'reset'

export interface AdminVoucherRow {
  id: number
  status: VoucherStatus
  requestedAt: string
  student: { email: string; firstname: string | null; lastname: string | null }
  certification: { code: string; name: string; provider: string }
}
export interface AdminVoucherList { rows: AdminVoucherRow[]; counts: Record<VoucherFilter, number> }

export async function listAll(filter: VoucherFilter): Promise<AdminVoucherList> {
  await delay()
  requireRole('admin')
  const t = db().tables
  const rows: AdminVoucherRow[] = [...t.voucherRequests]
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .map(v => {
      const u = t.users.find(x => x.id === v.userId)!
      const c = findCert(v.certificationId)!
      return {
        id: v.id, status: v.status, requestedAt: v.requestedAt,
        student: { email: u.email, firstname: u.firstname, lastname: u.lastname },
        certification: { code: c.code, name: c.name, provider: c.provider },
      }
    })
  const count = (s: VoucherStatus) => rows.filter(r => r.status === s).length
  return {
    rows: filter === 'all' ? rows : rows.filter(r => r.status === filter),
    counts: { all: rows.length, pending: count('pending'), approved: count('approved'), rejected: count('rejected') },
  }
}

export interface VoucherMailto { href: string; email: string }

function buildMailto(email: string, studentName: string, certName: string): VoucherMailto {
  const expiration = formatDate(new Date(Date.now() + 10 * 86_400_000).toISOString())
  const subject = `Your TEK-UP Voucher — ${certName}`
  const body = [
    `Dear ${studentName},`,
    '',
    'Congratulations on successfully passing the certification requirements.',
    '',
    'Please find below your voucher information for the certificate:',
    '',
    '---',
    '',
    'Voucher Code: [INSERT VOUCHER CODE]',
    `Certificate: ${certName}`,
    `Expiration Date: ${expiration}`,
    '----------------------------------',
    '',
    'You can use this voucher to complete your certification process according to the provided instructions.',
    '',
    'If you have any questions or need assistance, feel free to contact us.',
    '',
    'Best regards,',
    'TEKUP Certified Student Office',
  ].join('\n')
  return { email, href: `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` }
}

/** approve needs the logged-in admin's own password (replaces v1's hard-coded "admin"). */
export async function setStatus(id: number, action: VoucherAction, adminPassword = ''): Promise<{ mailto: VoucherMailto | null }> {
  await delay()
  const admin = requireRole('admin')
  const t = db().tables
  const v = t.voucherRequests.find(x => x.id === id)
  if (!v) throw new ApiError(404, 'Voucher request not found.')
  if (action === 'approve' && adminPassword !== admin.password) {
    throw new ApiError(400, 'Incorrect admin password — the voucher was not approved.')
  }
  v.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending'
  save()
  if (action !== 'approve') return { mailto: null }
  const u = t.users.find(x => x.id === v.userId)!
  const name = [u.firstname, u.lastname].filter(Boolean).join(' ') || u.email
  return { mailto: buildMailto(u.email, name, findCert(v.certificationId)!.name) }
}
```

- [ ] **Step 2: Write `src/api/messages.ts`** (INV §contact, §admin-messages, §admin-message)

```ts
import { db, nextId, save } from './db'
import { ApiError } from './errors'
import type { ContactMessage, MessageStatus } from './types'
import { delay, EMAIL_RE, nowIso, requireRole, sessionUser } from './util'

export interface ContactForm { name: string; surname: string; email: string; message: string }

/** A logged-in student's identity comes from the session; posted values are ignored (as v1). */
export async function send(form: ContactForm): Promise<void> {
  await delay()
  const u = sessionUser()
  const student = u?.role === 'student' ? u : null
  const name = (student ? student.firstname ?? '' : form.name).trim()
  const surname = (student ? student.lastname ?? '' : form.surname).trim()
  const email = (student ? student.email : form.email).trim()
  const message = form.message.trim()
  if (!name || !surname || !email || !message) throw new ApiError(400, 'Please fill in all fields.')
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Please enter a valid email address.')
  db().tables.contactMessages.push({
    id: nextId('contactMessages'), name: name.slice(0, 100), surname: surname.slice(0, 100), email: email.slice(0, 255),
    message, status: 'unread', submittedAt: nowIso(),
  })
  save()
}

export type MessageFilter = 'all' | MessageStatus
export interface MessageList { rows: ContactMessage[]; counts: Record<MessageFilter, number> }

export async function list(filter: MessageFilter): Promise<MessageList> {
  await delay()
  requireRole('admin')
  const rows = [...db().tables.contactMessages].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const unread = rows.filter(m => m.status === 'unread').length
  return {
    rows: filter === 'all' ? rows : rows.filter(m => m.status === filter),
    counts: { all: rows.length, unread, read: rows.length - unread },
  }
}

/** Opening a message marks it read (as v1). 404 → page redirects to the list. */
export async function get(id: number): Promise<ContactMessage> {
  await delay()
  requireRole('admin')
  const m = db().tables.contactMessages.find(x => x.id === id)
  if (!m) throw new ApiError(404, 'Message not found.')
  if (m.status === 'unread') {
    m.status = 'read'
    save()
  }
  return { ...m }
}

export async function remove(id: number): Promise<void> {
  await delay()
  requireRole('admin')
  const t = db().tables
  t.contactMessages = t.contactMessages.filter(m => m.id !== id)
  save()
}

export async function markUnread(id: number): Promise<void> {
  await delay()
  requireRole('admin')
  const m = db().tables.contactMessages.find(x => x.id === id)
  if (m) {
    m.status = 'unread'
    save()
  }
}
```

- [ ] **Step 3: Write `src/api/news.ts`** (INV §admin-news; 1 MB limit)

```ts
import { db, nextId, save } from './db'
import { ApiError } from './errors'
import type { NewsImage } from './types'
import { delay, nowIso, readFileAsDataUrl, requireRole } from './util'

export const MAX_UPLOAD_BYTES = 1024 * 1024
const NEWS_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

/** Public. Newest first. */
export async function list(): Promise<NewsImage[]> {
  await delay()
  return [...db().tables.news].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

export async function upload(file: File): Promise<string> {
  await delay()
  requireRole('admin')
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(400, 'The file is too large (max 1 MB).')
  const ext = NEWS_TYPES[file.type]
  if (!ext) throw new ApiError(400, 'Unsupported format. Use JPG, PNG, WEBP or GIF.')
  const url = await readFileAsDataUrl(file)
  const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  db().tables.news.push({ id: nextId('news'), name: `news_${Math.floor(Date.now() / 1000)}_${hex}.${ext}`, url, sizeBytes: file.size, uploadedAt: nowIso() })
  save() // throws ApiError(507) and rolls back when storage is full
  return "Image uploaded — it's now live on the homepage."
}

export async function remove(id: number): Promise<string> {
  await delay()
  requireRole('admin')
  const t = db().tables
  if (!t.news.some(n => n.id === id)) throw new ApiError(404, 'File not found.')
  t.news = t.news.filter(n => n.id !== id)
  save()
  return 'Image removed.'
}
```

- [ ] **Step 4: Write `src/api/profile.ts`** (INV §profile)

```ts
import { studentId } from '../lib/format'
import { db, save } from './db'
import { ApiError } from './errors'
import type { Profile, PublicUser } from './types'
import { delay, nowIso, readFileAsDataUrl, requireRole, toPublic } from './util'
import { MAX_UPLOAD_BYTES } from './news'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface ProfileView {
  user: PublicUser
  studentId: string
  phone: string
  address: string
  photo: string | null
  earnedCount: number
  memberSince: number
}

function profileRow(userId: number): Profile {
  const t = db().tables
  let p = t.profiles.find(x => x.userId === userId)
  if (!p) {
    p = { userId, phone: null, address: null, photo: null, updatedAt: nowIso() }
    t.profiles.push(p)
  }
  return p
}

export async function get(): Promise<ProfileView> {
  await delay()
  const u = requireRole('student')
  const p = db().tables.profiles.find(x => x.userId === u.id)
  return {
    user: toPublic(u),
    studentId: studentId(u.id),
    phone: p?.phone ?? '',
    address: p?.address ?? '',
    photo: p?.photo ?? null,
    earnedCount: db().tables.userCertifications.filter(uc => uc.userId === u.id && uc.status === 'earned').length,
    memberSince: new Date(u.createdAt).getFullYear(),
  }
}

export async function update(fields: { phone: string; address: string }): Promise<string> {
  await delay()
  const u = requireRole('student')
  const p = profileRow(u.id)
  p.phone = fields.phone.trim() || null
  p.address = fields.address.trim() || null
  p.updatedAt = nowIso()
  save()
  return 'Profile saved.'
}

export async function updatePhoto(file: File): Promise<string> {
  await delay()
  const u = requireRole('student')
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(400, 'The file is too large (max 1 MB).')
  if (!PHOTO_TYPES.includes(file.type)) throw new ApiError(400, 'Unsupported format. Use JPG, PNG or WEBP.')
  const p = profileRow(u.id)
  p.photo = await readFileAsDataUrl(file)
  p.updatedAt = nowIso()
  save()
  return 'Photo updated.'
}
```

- [ ] **Step 5: Write `src/api/stats.ts`** (INV §dashboard, §admin-dashboard, §admin-stats)

```ts
import { db } from './db'
import { delay, requireRole } from './util'

export interface StudentDashboard { displayName: string; email: string; earned: number; inProgress: number; examReady: number }

export async function dashboard(): Promise<StudentDashboard> {
  await delay()
  const u = requireRole('student')
  const mine = db().tables.userCertifications.filter(uc => uc.userId === u.id)
  return {
    displayName: u.firstname || u.email.split('@')[0] || u.email,
    email: u.email,
    earned: mine.filter(uc => uc.status === 'earned').length,
    inProgress: mine.filter(uc => uc.status === 'in_progress').length,
    examReady: mine.filter(uc => uc.progress >= 100).length,
  }
}

export interface AdminDashboard { pendingVouchers: number; students: number; enrolments: number; unreadMessages: number }

export async function adminDashboard(): Promise<AdminDashboard> {
  await delay()
  requireRole('admin')
  const t = db().tables
  return {
    pendingVouchers: t.voucherRequests.filter(v => v.status === 'pending').length,
    students: t.users.filter(u => u.role === 'student').length,
    enrolments: t.userCertifications.length,
    unreadMessages: t.contactMessages.filter(m => m.status === 'unread').length,
  }
}

export interface TopCert { code: string; name: string; provider: string; count: number; barPct: number }
export interface AdminStats {
  students: number
  catalogSize: number
  enrolments: number
  inProgress: number
  earned: number
  examReady: number
  vouchers: number
  pendingVouchers: number
  top: TopCert[]
}

export async function adminStats(): Promise<AdminStats> {
  await delay()
  requireRole('admin')
  const t = db().tables
  const counted = t.certifications
    .map(c => ({ code: c.code, name: c.name, provider: c.provider, count: t.userCertifications.filter(uc => uc.certificationId === c.id).length }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
    .slice(0, 5)
  const max = Math.max(1, counted[0]?.count ?? 0)
  return {
    students: t.users.filter(u => u.role === 'student').length,
    catalogSize: t.certifications.length,
    enrolments: t.userCertifications.length,
    inProgress: t.userCertifications.filter(uc => uc.status === 'in_progress').length,
    earned: t.userCertifications.filter(uc => uc.status === 'earned').length,
    examReady: t.userCertifications.filter(uc => uc.progress >= 100).length,
    vouchers: t.voucherRequests.length,
    pendingVouchers: t.voucherRequests.filter(v => v.status === 'pending').length,
    top: counted.map(c => ({ ...c, barPct: Math.round((100 * c.count) / max) })),
  }
}
```

"Registered students" counts role `student` (the seeded admin is not a student; v1 had no admin row).

- [ ] **Step 6: Write `src/api/index.ts`**

```ts
export * as auth from './auth'
export * as certifications from './certifications'
export * as courses from './courses'
export * as progress from './progress'
export * as whiteTest from './whiteTest'
export * as vouchers from './vouchers'
export * as messages from './messages'
export * as news from './news'
export * as profile from './profile'
export * as stats from './stats'
export { ApiError, isApiError } from './errors'
export { resetDemoData } from './db'
export type * from './types'
export type { Flash, CatalogGroup, CatalogItem, MyFilter, MyCertification, MyCertificationsView } from './certifications'
export type { CourseView, CourseSectionView, CourseVideoView } from './courses'
export type { MarkWatchedResult } from './progress'
export type { WhiteTestIntro, TakeView, ResultView, ResultItem } from './whiteTest'
export type { ReadyCourse, VoucherFilter, VoucherAction, AdminVoucherRow, AdminVoucherList, VoucherMailto } from './vouchers'
export type { ContactForm, MessageFilter, MessageList } from './messages'
export type { ProfileView } from './profile'
export type { StudentDashboard, AdminDashboard, AdminStats, TopCert } from './stats'
```

- [ ] **Step 7: Verify and commit**

Run: `npm run build` → 0; `npm run lint` → 0 errors.

```bash
git add frontend/src/api
git commit -m "feat(frontend): mock API for vouchers, messages, news, profile and stats"
```

---

### Task 5: App shell – auth, guards, layouts, shared components, router

**Files:**
- Create: `src/auth/context.ts`, `src/auth/AuthProvider.tsx`, `src/auth/useAuth.ts`, `src/auth/RequireRole.tsx`, `src/hooks/useAsync.ts`, `src/hooks/usePageTitle.ts`, `src/lib/wow.ts`, `src/components/{Header,Footer,Preloader,Modal,ConfirmModal,Notice,Loading,ScrollToHash}.tsx`, `src/layouts/{PublicLayout,PortalLayout,AdminLayout,ContactLayout}.tsx`, `src/pages/NotFound.tsx`, `src/router.tsx`, `src/app.css`
- Create (temporary stubs, replaced in Tasks 6–13): one file per page listed in the File Structure (18 files under `src/pages/public`, `src/pages/portal`, `src/pages/admin`), each written like this with its own function name and heading:

```tsx
export default function Dashboard() {
  return <div className="container" style={{ paddingTop: 160, minHeight: '60vh' }}><h4>Dashboard</h4></div>
}
```
- Modify: `src/App.tsx`, `src/main.tsx` (import `./app.css`)

**Interfaces:**
- Consumes: `auth` API (Task 3), `resetDemoData` (Task 4).
- Produces:
  - `useAuth(): AuthValue` where `AuthValue = { user: PublicUser | null; ready: boolean; login(email: string, password: string): Promise<PublicUser>; logout(): Promise<void> }`
  - `homeFor(role: Role): string` → `'/admin'` | `'/dashboard'`
  - `useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): { data: T | undefined; error: Error | null; loading: boolean; reload(): void }`
  - `usePageTitle(title: string): void`
  - `wow(animation: string, duration?: string, delay?: string, extraClass?: string): { className: string; style: CSSProperties }`
  - `<Modal open onClose staticBackdrop? dialogClassName? contentClassName? labelledBy?>` children = the v1 `.modal-content` inner markup
  - `<ConfirmModal open title body confirmLabel onConfirm onCancel busy?>`
  - `<Notice type message />` → `div.form-notice.is-{type}`; `<FeFlash error? icon? children>` → `div.fe-flash`
  - `<Loading />`, `<ErrorBox error />`
  - Route paths (used by every page for `<Link>`):

| Route | Page component |
|---|---|
| `/` | `pages/public/Home` |
| `/login` | `pages/public/Login` |
| `/contact` | `pages/public/Contact` (inside `ContactLayout`) |
| `/dashboard` `/catalog` `/certifications` `/course/:certId` `/white-test/:certId` `/white-test/:certId/take` `/white-test/:certId/result` `/final-exams` `/profile` | `pages/portal/*` inside `PortalLayout` |
| `/admin` `/admin/vouchers` `/admin/messages` `/admin/messages/:id` `/admin/news` `/admin/stats` | `pages/admin/*` inside `AdminLayout` |
| `*` | `pages/NotFound` |

- [ ] **Step 1: Auth files**

```ts
// src/auth/context.ts
import { createContext } from 'react'
import type { PublicUser } from '../api'

export interface AuthValue {
  user: PublicUser | null
  ready: boolean
  login(email: string, password: string): Promise<PublicUser>
  logout(): Promise<void>
}
export const AuthContext = createContext<AuthValue | null>(null)
```

```tsx
// src/auth/AuthProvider.tsx
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, type PublicUser } from '../api'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    auth.currentUser().then(u => {
      if (!alive) return
      setUser(u)
      setReady(true)
    })
    return () => { alive = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await auth.login(email, password)
    setUser(u)
    return u
  }, [])
  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

```ts
// src/auth/useAuth.ts
import { useContext } from 'react'
import { AuthContext, type AuthValue } from './context'

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
```

```tsx
// src/auth/RequireRole.tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../api'
import { useAuth } from './useAuth'

export const homeFor = (role: Role): string => (role === 'admin' ? '/admin' : '/dashboard')

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}
```

If `react-refresh/only-export-components` warns about `homeFor` in `RequireRole.tsx`, move `homeFor` to `src/auth/homeFor.ts` and import it.

- [ ] **Step 2: Hooks and wow helper**

```ts
// src/hooks/useAsync.ts
import { useCallback, useEffect, useState } from 'react'

interface State<T> { key: string | null; data: T | undefined; error: Error | null }

/**
 * Runs `fn` whenever `deps` (primitives) change. Keeps the previous data while
 * reloading so pages don't flash after an action.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [tick, setTick] = useState(0)
  const key = JSON.stringify([...deps, tick])
  const [state, setState] = useState<State<T>>({ key: null, data: undefined, error: null })

  useEffect(() => {
    let alive = true
    fn().then(
      data => { if (alive) setState({ key, data, error: null }) },
      (e: unknown) => { if (alive) setState(s => ({ key, data: s.data, error: e instanceof Error ? e : new Error(String(e)) })) },
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures deps
  }, [key])

  const reload = useCallback(() => setTick(t => t + 1), [])
  return { data: state.data, error: state.key === key ? state.error : null, loading: state.key !== key, reload }
}
```

```ts
// src/hooks/usePageTitle.ts
import { useEffect } from 'react'

export function usePageTitle(title: string): void {
  useEffect(() => { document.title = title }, [title])
}
```

```ts
// src/lib/wow.ts
import type { CSSProperties } from 'react'

/** Replaces WOW.js: plays the animate.css animation on mount. */
export function wow(animation: string, duration?: string, delay?: string, extraClass = ''): { className: string; style: CSSProperties } {
  return {
    className: `${extraClass} wow ${animation} animated`.trim(),
    style: { animationDuration: duration, animationDelay: delay },
  }
}
```

- [ ] **Step 3: Shared components**

```tsx
// src/components/Preloader.tsx
import { useEffect, useState } from 'react'

export function Preloader() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setLoaded(true), 50)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div id="js-preloader" className={`js-preloader${loaded ? ' loaded' : ''}`}>
      <div className="preloader-inner">
        <span className="dot"></span>
        <div className="dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  )
}
```

```tsx
// src/components/Modal.tsx
import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose(): void
  children: ReactNode
  staticBackdrop?: boolean
  dialogClassName?: string
  contentClassName?: string
  labelledBy?: string
}

/** Bootstrap 5 modal markup, driven by React state instead of bootstrap.js. */
export function Modal({ open, onClose, children, staticBackdrop = false, dialogClassName = 'modal-dialog-centered', contentClassName = '', labelledBy }: Props) {
  useEffect(() => {
    if (!open) return
    document.body.classList.add('modal-open')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !staticBackdrop) onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKey)
    }
  }, [open, staticBackdrop, onClose])

  if (!open) return null
  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={e => { if (e.target === e.currentTarget && !staticBackdrop) onClose() }}
      >
        <div className={`modal-dialog ${dialogClassName}`}>
          <div className={`modal-content ${contentClassName}`.trim()}>{children}</div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  )
}
```

When porting a v1 modal, pass v1's dialog/content classes via `dialogClassName`/`contentClassName` and put the inner markup (header/body/footer) as children.

```tsx
// src/components/ConfirmModal.tsx
import type { ReactNode } from 'react'
import { Modal } from './Modal'

interface Props {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm(): void
  onCancel(): void
  busy?: boolean
}

/** Replaces v1's window.confirm() with the same texts. */
export function ConfirmModal({ open, title, body, confirmLabel, onConfirm, onCancel, busy = false }: Props) {
  return (
    <Modal open={open} onClose={onCancel}>
      <div className="modal-body p-4">
        <h4 className="mb-3">{title}</h4>
        <p>{body}</p>
        <div className="d-flex gap-2 justify-content-end mt-4">
          <button type="button" className="wt-btn wt-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="wt-btn wt-btn--ghost wt-btn--danger" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
```

```tsx
// src/components/Notice.tsx
import type { ReactNode } from 'react'

export function Notice({ type, message }: { type: 'success' | 'error' | 'info'; message: ReactNode }) {
  return <div className={`form-notice is-${type}`}>{message}</div>
}

/** v1 `.fe-flash` (final-exams, admin-vouchers, admin-messages). */
export function FeFlash({ error = false, icon = 'fa-check-circle', className = '', children }: { error?: boolean; icon?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`fe-flash${error ? ' is-error' : ''} ${className}`.trim()}>
      <i className={`fa ${error ? 'fa-exclamation-triangle' : icon}`}></i>
      {children}
    </div>
  )
}
```

Check the exact `.fe-flash` inner markup in v1 `final-exams.php` / `admin-vouchers.php` flash blocks and match it (icon position, wrapping `<span>`s) — adjust `FeFlash` if v1 wraps the text.

```tsx
// src/components/Loading.tsx
export function Loading() {
  return <div className="container" style={{ padding: '160px 0 80px', textAlign: 'center' }}><i className="fa fa-spinner fa-spin fa-2x"></i></div>
}

export function ErrorBox({ error }: { error: Error }) {
  return <div className="container" style={{ paddingTop: 160 }}><div className="form-notice is-error">{error.message}</div></div>
}
```

```tsx
// src/components/ScrollToHash.tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Replaces the template's smooth-scroll: /#about scrolls to #about; other navigations go to top. */
export function ScrollToHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = window.setTimeout(() => {
      const el = document.getElementById(hash.slice(1))
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 1, behavior: 'smooth' })
    }, 0)
    return () => window.clearTimeout(id)
  }, [pathname, hash])
  return null
}
```

- [ ] **Step 4: Header** (INV §1 nav tables; v1 markup in `Project/includes/nav-*.php`)

```tsx
// src/components/Header.tsx
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

type Variant = 'public' | 'portal' | 'admin'
interface Item { label: string; to: string; match?: string[]; scroll?: boolean }

const NAV: Record<Variant, Item[]> = {
  public: [
    { label: 'Home', to: '/#top', scroll: true },
    { label: 'About', to: '/#about', scroll: true },
    { label: 'News', to: '/#news', scroll: true },
    { label: 'Certifications', to: '/#services', scroll: true },
    { label: 'Categories', to: '/#portfolio', scroll: true },
    { label: 'Endorsements', to: '/#blog', scroll: true },
    { label: 'Contact', to: '/#contact', scroll: true },
  ],
  portal: [
    { label: 'Dashboard', to: '/dashboard', match: ['/dashboard'] },
    { label: 'My Certifications', to: '/certifications', match: ['/certifications', '/catalog', '/course', '/white-test'] },
    { label: 'Profile', to: '/profile', match: ['/profile'] },
    { label: 'Contact', to: '/contact', match: ['/contact'] },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', match: ['/admin'] },
    { label: 'Vouchers', to: '/admin/vouchers', match: ['/admin/vouchers'] },
    { label: 'Statistics', to: '/admin/stats', match: ['/admin/stats'] },
    { label: 'News', to: '/admin/news', match: ['/admin/news'] },
    { label: 'Messages', to: '/admin/messages', match: ['/admin/messages'] },
  ],
}

export function Header({ variant }: { variant: Variant }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const isHome = variant === 'public' && pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  // Sticky header: only the home page starts transparent (INV §4).
  useEffect(() => {
    if (!isHome) return
    const onScroll = () => {
      const text = document.querySelector<HTMLElement>('.header-text')
      const header = document.querySelector<HTMLElement>('header')
      const limit = (text?.offsetHeight ?? 0) - (header?.offsetHeight ?? 0)
      setScrolled(window.scrollY >= limit)
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  const solid = !isHome || scrolled
  const isActive = (item: Item): boolean => {
    if (item.label === 'Home' && isHome) return true
    if (!item.match) return false
    return item.match.some(m => (m === '/admin' ? pathname === '/admin' : pathname === m || pathname.startsWith(`${m}/`)))
  }
  const onSignOut = async (e: MouseEvent) => {
    e.preventDefault()
    await logout()
    navigate('/')
  }
  const brand = variant === 'admin'
    ? { to: '/admin', alt: 'TEK-UP Admin', sub: ' Admin Console' }
    : { to: '/', alt: 'TEK-UP Certif', sub: ' Certified Students' }

  return (
    <header className={`header-area header-sticky${solid ? ' background-header' : ''} wow slideInDown animated`} style={{ animationDuration: '0.75s', animationDelay: '0s' }}>
      <div className="container">
        <div className="row">
          <div className="col-12">
            <nav className="main-nav">
              <Link to={brand.to} className="logo">
                <img src="/assets/images/logo1.png" alt={brand.alt} />
                <h4>TEK-UP<span>{brand.sub}</span></h4>
              </Link>
              <ul className="nav" style={menuOpen ? { display: 'block' } : undefined}>
                {NAV[variant].map(item => (
                  <li key={item.label} className={item.scroll ? 'scroll-to-section' : undefined}>
                    <Link to={item.to} className={isActive(item) ? 'active' : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link>
                  </li>
                ))}
                <li>
                  <div className="main-red-button">
                    {variant === 'public'
                      ? <Link to="/login">Login</Link>
                      : <a href="/" onClick={onSignOut}>Sign Out</a>}
                  </div>
                </li>
              </ul>
              <a className={`menu-trigger${menuOpen ? ' active' : ''}`} onClick={() => setMenuOpen(o => !o)} role="button" aria-label="Menu">
                <span>Menu</span>
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
```

(v1 login page uses the public nav with `background-header`; that is covered because the header is solid on every route except `/`.)

- [ ] **Step 5: Footer** (INV §0 footer)

```tsx
// src/components/Footer.tsx
import type { MouseEvent } from 'react'
import { resetDemoData } from '../api'
import { wow } from '../lib/wow'

export function Footer() {
  const onReset = (e: MouseEvent) => {
    e.preventDefault()
    resetDemoData()
    window.location.assign('/')
  }
  return (
    <footer>
      <div className="container">
        <div className="row">
          <div {...wow('fadeIn', '1s', '0.25s', 'col-lg-12')}>
            <p>
              © Copyright {new Date().getFullYear()} TEK-UP University &mdash; Certified Students. All Rights Reserved.
              <br />Reference: <a rel="nofollow" href="https://tek-up.de/certif/">tek-up.de/certif</a>
              <br /><a href="/" onClick={onReset} style={{ fontSize: 12, opacity: 0.7 }}>Reset demo data</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
```

`new Date()` in render: if the React Compiler lint rule `react-hooks/purity` flags it, compute `const YEAR = new Date().getFullYear()` at module level instead.

- [ ] **Step 6: Layouts**

```tsx
// src/layouts/PublicLayout.tsx
import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ScrollToHash } from '../components/ScrollToHash'

export default function PublicLayout() {
  return (<><ScrollToHash /><Header variant="public" /><Outlet /><Footer /></>)
}
```

```tsx
// src/layouts/PortalLayout.tsx
import { Outlet } from 'react-router-dom'
import { RequireRole } from '../auth/RequireRole'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ScrollToHash } from '../components/ScrollToHash'

export default function PortalLayout() {
  return (
    <RequireRole role="student">
      <ScrollToHash /><Header variant="portal" /><Outlet /><Footer />
    </RequireRole>
  )
}
```

```tsx
// src/layouts/AdminLayout.tsx
import { Outlet } from 'react-router-dom'
import { RequireRole } from '../auth/RequireRole'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ScrollToHash } from '../components/ScrollToHash'

export default function AdminLayout() {
  return (
    <RequireRole role="admin">
      <ScrollToHash /><Header variant="admin" /><Outlet /><Footer />
    </RequireRole>
  )
}
```

```tsx
// src/layouts/ContactLayout.tsx — portal nav for a logged-in student, public nav otherwise (INV §contact)
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ScrollToHash } from '../components/ScrollToHash'

export default function ContactLayout() {
  const { user, ready } = useAuth()
  if (!ready) return null
  return (<><ScrollToHash /><Header variant={user?.role === 'student' ? 'portal' : 'public'} /><Outlet /><Footer /></>)
}
```

- [ ] **Step 7: NotFound, router, App**

```tsx
// src/pages/NotFound.tsx
import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found — TEK-UP Certified Students')
  return (
    <>
      <Header variant="public" />
      <div className="container not-found">
        <h2>Page <em>not found</em></h2>
        <p>The page you are looking for does not exist.</p>
        <div className="main-blue-button"><Link to="/">Back to home</Link></div>
      </div>
      <Footer />
    </>
  )
}
```

```tsx
// src/router.tsx
import { createBrowserRouter } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import ContactLayout from './layouts/ContactLayout'
import PortalLayout from './layouts/PortalLayout'
import PublicLayout from './layouts/PublicLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMessage from './pages/admin/AdminMessage'
import AdminMessages from './pages/admin/AdminMessages'
import AdminNews from './pages/admin/AdminNews'
import AdminStats from './pages/admin/AdminStats'
import AdminVouchers from './pages/admin/AdminVouchers'
import NotFound from './pages/NotFound'
import Catalog from './pages/portal/Catalog'
import Certifications from './pages/portal/Certifications'
import Course from './pages/portal/Course'
import Dashboard from './pages/portal/Dashboard'
import FinalExams from './pages/portal/FinalExams'
import Profile from './pages/portal/Profile'
import WhiteTestIntro from './pages/portal/WhiteTestIntro'
import WhiteTestResult from './pages/portal/WhiteTestResult'
import WhiteTestTake from './pages/portal/WhiteTestTake'
import Contact from './pages/public/Contact'
import Home from './pages/public/Home'
import Login from './pages/public/Login'

export const router = createBrowserRouter([
  { element: <PublicLayout />, children: [{ path: '/', element: <Home /> }, { path: '/login', element: <Login /> }] },
  { element: <ContactLayout />, children: [{ path: '/contact', element: <Contact /> }] },
  {
    element: <PortalLayout />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/catalog', element: <Catalog /> },
      { path: '/certifications', element: <Certifications /> },
      { path: '/course/:certId', element: <Course /> },
      { path: '/white-test/:certId', element: <WhiteTestIntro /> },
      { path: '/white-test/:certId/take', element: <WhiteTestTake /> },
      { path: '/white-test/:certId/result', element: <WhiteTestResult /> },
      { path: '/final-exams', element: <FinalExams /> },
      { path: '/profile', element: <Profile /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: '/admin', element: <AdminDashboard /> },
      { path: '/admin/vouchers', element: <AdminVouchers /> },
      { path: '/admin/messages', element: <AdminMessages /> },
      { path: '/admin/messages/:id', element: <AdminMessage /> },
      { path: '/admin/news', element: <AdminNews /> },
      { path: '/admin/stats', element: <AdminStats /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
```

```tsx
// src/App.tsx
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Preloader } from './components/Preloader'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <Preloader />
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
```

Add `import './app.css'` to `src/main.tsx`, and create `src/app.css`:

```css
/* Additions for the React port only. v1 styles live in public/assets/css. */
.not-found { padding: 180px 0 120px; text-align: center; }
.not-found .main-blue-button { display: inline-block; margin-top: 20px; }
.modal-backdrop.show { opacity: 0.5; }
```

- [ ] **Step 8: Verify (Review Focus 2)**

Run: `npm run build` → 0; `npm run lint` → 0 errors. `npm run dev`:
- `/` shows the stub Home with the public header and the footer (the stub has no `.header-text`, so the header is solid; the transparent-until-scroll behaviour is checked in Task 6).
- Logged out, `/dashboard`, `/catalog`, `/admin`, `/admin/news` → redirected to `/login`. (Logged-in redirects are checked in Task 6, once the login page exists.)
- `/nope` → 404 page.
- Resize to < 992 px: the Menu trigger toggles the nav list.

- [ ] **Step 9: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): app shell with auth, guards, layouts and routing"
```

---

### Task 6: Public pages – Home, Login, Contact

**Files:**
- Create: `src/components/Carousel.tsx`
- Modify (replace stubs): `src/pages/public/Home.tsx`, `src/pages/public/Login.tsx`, `src/pages/public/Contact.tsx`

**Interfaces:**
- Consumes: `news.list`, `messages.send`, `useAuth().login`, `homeFor`, `wow`, `Notice`, `usePageTitle`.
- Produces: `<Carousel images={NewsImage[]} />`.

- [ ] **Step 1: Write `src/components/Carousel.tsx`** (replaces the Bootstrap carousel, INV §index step 5: interval 3500 ms, no pause, wraps)

```tsx
import { useEffect, useState } from 'react'
import type { NewsImage } from '../api'

export function Carousel({ images }: { images: NewsImage[] }) {
  const [index, setIndex] = useState(0)
  const count = images.length
  const current = count === 0 ? 0 : index % count

  useEffect(() => {
    if (count < 2) return
    const id = window.setInterval(() => setIndex(i => (i + 1) % count), 3500)
    return () => window.clearInterval(id)
  }, [count])

  const go = (i: number) => setIndex((i + count) % count)
  return (
    <div id="newsCarousel" className="carousel slide news-carousel">
      {count > 1 && (
        <div className="carousel-indicators">
          {images.map((img, i) => (
            <button key={img.id} type="button" className={i === current ? 'active' : undefined} aria-current={i === current} aria-label={`Slide ${i + 1}`} onClick={() => go(i)}></button>
          ))}
        </div>
      )}
      <div className="carousel-inner">
        {images.map((img, i) => (
          <div key={img.id} className={`carousel-item${i === current ? ' active' : ''}`}>
            <img src={img.url} className="d-block w-100" alt="TEK-UP student achievement" />
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button className="carousel-control-prev" type="button" onClick={() => go(current - 1)}>
            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Previous</span>
          </button>
          <button className="carousel-control-next" type="button" onClick={() => go(current + 1)}>
            <span className="carousel-control-next-icon" aria-hidden="true"></span>
            <span className="visually-hidden">Next</span>
          </button>
        </>
      )}
    </div>
  )
}
```

Compare with v1 `index.php` lines 107–168 and copy any extra wrapper classes/ids v1 uses around the carousel so `.our-news` / `.news-carousel` CSS applies.

- [ ] **Step 2: Home** (`index.php` lines 9–423, INV §index)

- `usePageTitle('TEK-UP Certified Students')`.
- Convert all sections (`#top`, `#about`, `#news`, `#services`, `#portfolio`, `#blog`, `#contact`) using the conversion rules. Image paths become absolute (`/assets/images/...`); partner file names with spaces use `encodeURI`, e.g. `` src={`/assets/images/partners/${encodeURIComponent('Chuck Robbins.jpg')}`} ``.
- News: `const { data: images } = useAsync(() => news.list(), [])`. Render the whole `#news` section only when `images && images.length > 0`; inside it `<Carousel images={images} />` with the v1 heading/subtitle.
- The `#contact` form: controlled inputs `name`, `surname`, `email`, `message` (all `required`); on submit call `messages.send(form)`; on success `navigate('/contact?sent=1')`; on `ApiError` navigate to `/contact` with the error in router state: `navigate('/contact', { state: { error: e.message, form } })`. (v1 posts this form to contact.php, which shows the result.)
- Social links, skill bars, tracks and endorsements are static markup.

- [ ] **Step 3: Login** (`login.php` lines 69–127, INV §login)

```tsx
// core logic — wrap it in the converted v1 markup
const { user, ready, login } = useAuth()
const navigate = useNavigate()
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [error, setError] = useState('')
const [busy, setBusy] = useState(false)
usePageTitle('Sign In — TEK-UP Certified Students')

if (ready && user) return <Navigate to={homeFor(user.role)} replace />

const onSubmit = async (e: FormEvent) => {  // import type { FormEvent } from 'react'
  e.preventDefault()
  setBusy(true)
  setError('')
  try {
    const u = await login(email, password)
    navigate(homeFor(u.role), { replace: true })
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Invalid email or password.')
    setPassword('')
  } finally {
    setBusy(false)
  }
}
```

- Inputs use `type="email"` in v1? Use `type="text"` with `inputMode="email"` so the browser does not block the mock's own validation message (the mock returns `Please enter a valid email address.`). Email stays filled on error; password is cleared.
- Error renders in v1's `.login-error` element. `Remember me` checkbox is kept but unused; `Forgot password?` is `href="#"` with `preventDefault`.
- Submit button disabled while `busy`.
- `Talk to the Certifications Office →` links to `/#contact`.

- [ ] **Step 4: Contact** (`contact.php` lines 69–142, INV §contact)

- `usePageTitle('Contact — TEK-UP Certified Students')`.
- `const { user } = useAuth()`; `const student = user?.role === 'student' ? user : null`.
- Controlled fields; initial values from `location.state?.form` if present (coming from the home page form), else empty. When `student` is set, the name/surname/email inputs are `disabled` and show `student.firstname`, `student.lastname`, `student.email`, and the `.contact-signed-in` banner shows `Signed in as <strong>{First Last}</strong> — your details are filled in below.`
- Error: from submit, or `location.state?.error`. Rendered as `<Notice type="error" …/>`.
- `?sent=1` (`useSearchParams`) → `<Notice type="success" message="Thanks — your message has been received. The Certifications Office will reply within one business day." />` (use `&mdash;` in JSX as v1).
- Submit: `await messages.send(form)`; success → `navigate('/contact?sent=1', { replace: true })` and clear the message field; error → show message, keep values. Button disabled while busy.

- [ ] **Step 5: Verify**

`npm run build` → 0; `npm run lint` → 0 errors. `npm run dev`, compare side by side with v1 screenshots (or v1 running in XAMPP if available):
- Home: all sections render with images; carousel auto-advances every 3.5 s and the arrows/indicators work; nav links scroll to sections; header turns solid on scroll.
- Login: empty submit → `Please enter both email and password.`; `abc` → `Please enter a valid email address.`; wrong password → `Invalid email or password.`; `user1@tek-up.de`/`123456789` → `/dashboard` stub; reload keeps you logged in; `/login` while logged in → `/dashboard`; `/admin` as student → `/dashboard`. Sign Out → `/`. `admin@tek-up.de`/`admin123` → `/admin` stub; `/dashboard` as admin → `/admin`.
- Contact (logged out): empty → `Please fill in all fields.`; bad email → `Please enter a valid email address.`; valid → success notice. Contact as student: fields locked and pre-filled, portal nav shown. Home page form submission lands on `/contact` with the right notice.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): home, login and contact pages"
```

---

### Task 7: Student pages – Dashboard, Catalog, My Certifications

**Files:**
- Modify (replace stubs): `src/pages/portal/Dashboard.tsx`, `src/pages/portal/Catalog.tsx`, `src/pages/portal/Certifications.tsx`

**Interfaces:**
- Consumes: `stats.dashboard`, `certifications.listCatalog/enroll/listMine/cancel`, `Modal`, `Notice`, `Loading`, `ErrorBox`, `useAsync`, `wow`, `formatDate`, `pad2`.

Common page pattern (use in every data page from here on):

```tsx
const { data, error, loading, reload } = useAsync(() => stats.dashboard(), [])
if (error) return <ErrorBox error={error} />
if (!data) return <Loading />
// render v1 markup with data; `loading` can dim the list while reloading after an action
```

- [ ] **Step 1: Dashboard** (`dashboard.php` lines 42–89, INV §dashboard)

Title `Dashboard — TEK-UP Certified Students`. Three cards with the exact strings; `{earned} earned &middot; {inProgress} in progress`; Final Exams text `{n} course{plural(n)} ready for the official exam.` when `examReady > 0`, else `Finish a course to unlock voucher requests.`; links → `/certifications`, `/final-exams`, `/profile`.

- [ ] **Step 2: Catalog** (`catalog.php` lines 116–217, INV §catalog)

- Title `Catalog — TEK-UP Certified Students`. Back-link `Back to my certifications` → `/certifications`.
- Groups from `listCatalog()`; heading shows `<span className="cat-count">{items.length}</span>`. Card WOW delay: `Math.min(0.15 + 0.05 * i, 0.6)` s, `i` reset per group.
- Card action: `enrolled` → Enrolled pill; `featured` → `Enroll &rarr;` button that opens the modal for that cert; else disabled `.enroll-btn.is-locked` with `title="Not open for enrolment yet"`.
- Modal (v1 lines 186–217 markup inside `<Modal>`): shows name + `({code})`, password input auto-focused (`autoFocus`), cleared when the modal closes; `Confirm enrolment` submits `certifications.enroll(certId, password)`; `Cancel` closes.
- Result: success/info → close modal, `setFlash(result)`, `reload()`; `ApiError` → close modal, `setFlash({ type: 'error', message: e.message })` (v1 renders the flash on the page, not in the modal). Flash renders as `<Notice>` where v1 renders it. Confirm button disabled while busy (Review Focus 5).

- [ ] **Step 3: My Certifications** (`certifications.php` lines 83–232, INV §certifications)

- Title `My Certifications — TEK-UP Certified Students`.
- `filter` from `useSearchParams().get('filter')`, normalised to `all | earned | in_progress` (anything else → `all`). `useAsync(() => certifications.listMine(filter), [filter])`.
- Stat strip: `pad2(earned)`, `pad2(inProgress)`, `{available}+`.
- Chips (hidden when `total === 0`): All / Earned / In progress → `/certifications?filter=…`, active `.is-active`; `Enroll in more` → `/catalog`.
- Cards per INV (earned first). In progress: progress bar `style={{ width: `${progress}%` }}` + label; `Enrolled {formatDate(enrolledAt)}`; `Continue &rarr;` → `/course/{id}`; `Cancel` opens the cancel modal. Earned: `Earned {formatDate(earnedAt)}` + `View certificate &rarr;` (`href="#"`). WOW delay `0.2 + 0.1 * i` s.
- Empty state (when `total === 0`) + onboarding modal (`staticBackdrop`) opened on every visit while empty; `Start Enrolling` → `/catalog`, `Maybe later` closes it.
- Cancel modal (v1 text with name and code): `Yes, cancel enrolment` → `certifications.cancel(id)` → flash + `reload()`; errors → error flash. Button disabled while busy.

- [ ] **Step 4: Verify**

`npm run build` / `npm run lint`. As `user1`: dashboard shows `0 earned · 1 in progress`, `Finish a course…`. Catalog: PCEP, PCAP, AWS-CLF are the only enrollable certs; PCAP shows Enrolled. Enroll in PCEP with a wrong password → `Wrong password. Enrolment cancelled.`; empty → `Please enter your password…`; correct → success flash, PCEP now Enrolled. Double-click Confirm → only one enrolment. My Certifications lists PCEP then PCAP (newest first); filters work; `?filter=bogus` behaves as All; cancel PCEP → `Enrolment cancelled.` Cancel all enrolments → empty state and onboarding modal appears; re-enroll PCAP afterwards (its watched videos are kept, progress shows on next watch).

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): dashboard, catalog and my certifications pages"
```

---

### Task 8: Course player

**Files:**
- Modify (replace stub): `src/pages/portal/Course.tsx`

**Interfaces:**
- Consumes: `courses.getCourse`, `progress.markWatched`, `isApiError`, `CourseView`.

- [ ] **Step 1: Load and guard** (INV §course access rules)

```tsx
const { certId: raw } = useParams()
const certId = Number(raw)
const valid = Number.isInteger(certId) && certId > 0
const { data, error } = useAsync(() => (valid ? courses.getCourse(certId) : Promise.reject(new ApiError(404, 'bad id'))), [certId])
if (!valid || isApiError(error, 404)) return <Navigate to="/certifications" replace />
if (isApiError(error, 403)) return <Navigate to="/catalog" replace />
if (error) return <ErrorBox error={error} />
if (!data) return <Loading />
```

Title: `` `${data.certification.name} — TEK-UP Certified Students` `` (call `usePageTitle` before the early returns with a fallback while loading, since hooks must not be conditional).

- [ ] **Step 2: Player state** — split the file into `Course` (Step 1: loading and guards, then `return <CoursePlayer key={certId} initial={data} />`) and a `CoursePlayer` component in the same file that copies the loaded course into local state, so marking a video updates the UI without refetching:

```tsx
function CoursePlayer({ initial }: { initial: CourseView }) {
  const [course, setCourse] = useState(initial)
  const [playingId, setPlayingId] = useState(initial.initialVideoId)
  const [openSectionId, setOpenSectionId] = useState<number | null>(
    initial.sections.find(s => s.videos.some(v => v.id === initial.initialVideoId))?.id ?? null,
  )
  const markedFor = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  // … behaviour from Step 3 …
}
```

The `key={certId}` resets the player when moving to another course. (`// … behaviour from Step 3 …` marks where Step 3's handlers and JSX go.)

- [ ] **Step 3: Behaviour** (INV §course step 5)

- Flatten videos in section/position order: `const all = course.sections.flatMap(s => s.videos)`.
- Rail: `<details className="course-section" open={openSectionId === s.id}>`; clicking a `<summary>` sets `openSectionId` to that section (others close) — `onClick={e => { e.preventDefault(); setOpenSectionId(id => id === s.id ? null : s.id) }}`. Summary text `{position}. {title}` + `.sec-count` `{watched}/{total}`.
- Row: `li.course-video-row` (+ `is-playing`), `.status-mark` = `✓` if watched, else `▶` if playing, else empty. Click → `play(video.id)`: set `playingId`, open its section, reset `markedFor.current = null`, and set an `autoplayRef.current = true` flag; the video element's `onLoadedMetadata` calls `videoRef.current?.play().catch(() => {})` when that flag is set (so the initial video does not autoplay, as v1).
- `<video ref={videoRef} id="coursePlayer" controls preload="metadata" key={playingId}>` with `<source src={v.videoUrl} type="video/mp4" />` and, if `v.subtitleUrl`, `<track kind="subtitles" src={v.subtitleUrl} srcLang="en" label="English" default />`; fallback text `Your browser does not support HTML5 video.` (Using `key={playingId}` remounts the element, which replaces v1's manual `load()`.)
- `onTimeUpdate`: if `duration` is a finite number and `currentTime / duration >= 0.9` and `markedFor.current !== playingId` → set `markedFor.current = playingId`, optimistically mark the video watched in state (row ✓, section count, overall `%` = `Math.round(100 * watchedCount / all.length)`), then `progress.markWatched(id).then(r => update progress/section from r).catch(() => { markedFor.current = null })`.
- `onEnded`: play the next video in `all` order, if any.
- Header: `{provider} &middot; {code}`, name, `#courseBar` width `{progress}%`, label `{progress}% complete`.
- White-test row: `{sections.length + 1}. Pass white test`; when `progress >= 100` → `<Link className="white-test-row" to={`/white-test/${certId}`}>` with `fa-trophy`; else `<a className="white-test-row is-locked" href="#" aria-disabled="true" onClick={e => e.preventDefault()}>` with `fa-lock`.
- `!hasContent` → `Content not yet uploaded` block with `Back` → `/certifications`. No videos → `No videos in this course yet.`
- Back-link `Back to my certifications` → `/certifications`.

- [ ] **Step 4: Verify (Review Focus 2)**

Place any small mp4 at `public/media/pcap/01-introduction/01-welcome.mp4` (not committed; `.gitignore` it by adding `public/media/*` and `!public/media/README.txt` to `frontend/.gitignore`) to test playback if one is available; otherwise verify with DevTools that the `<video>` requests `/media/pcap/…`.
- As user1: `/course/27` opens PCAP, `33% complete`, section 1 open, `▶` on video 3 (first unwatched), ✓ on videos 1–2, white test locked.
- Clicking rows switches the playing row and title; opening one section closes the others.
- With a sample video: seeking past 90 % ticks the row, updates `x/y` and the % bar; reload → persisted.
- `/course/27` as user2 → 100 %, white test row unlocked. `/course/1` (not enrolled) → `/catalog`. `/course/9999` and `/course/abc` → `/certifications`. PCEP after enrolling → content with 4 videos. A non-media cert (e.g. AWS-CLF after enrolling) → `Content not yet uploaded`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src frontend/.gitignore
git commit -m "feat(frontend): course player with watched-progress tracking"
```

---

### Task 9: White test – intro, take, result

**Files:**
- Modify (replace stubs): `src/pages/portal/WhiteTestIntro.tsx`, `src/pages/portal/WhiteTestTake.tsx`, `src/pages/portal/WhiteTestResult.tsx`

**Interfaces:**
- Consumes: `whiteTest.getIntro/start/current/answer/result`, `TIME_LIMIT_SECONDS` not needed by pages, `TakeView`, `ResultView`.

- [ ] **Step 1: Intro** (`white-test.php` lines 55–106, INV §white-test)

- `certId` parsing as in Task 8. Errors: 404 / invalid → `/certifications`; 403 → `` `/course/${certId}` ``.
- Title `` `White Test — ${name}` ``. Markup incl. inline styles (lines 70–77 → style objects). Meta cards `10 minutes`, `{questionCount || 5}` questions, `70%`.
- `available === false` → replace the trophy/start block with `<Notice type="info" message="No white test available yet." />` and keep the back-link (spec §8).
- `Start the test` → `await whiteTest.start(certId)` → `navigate(`/white-test/${certId}/take`)`. Button disabled while busy.

- [ ] **Step 2: Take** (`white-test-take.php` lines 66–151, INV §white-test-take)

```tsx
// after loading `view` with useAsync(() => whiteTest.current(certId), [certId, step])
if (view.status === 'none') return <Navigate to="/certifications" replace />
if (view.status === 'submitted') return <Navigate to={`/white-test/${certId}/result`} replace />
```

- Render `Question {index + 1} / {total}`, the timer, the question and the four choices (`label.wt-choice` + `is-selected`, radio `name="answer"`), selection kept in local state initialised from `view.selected`.
- Timer: a child component `Countdown({ seconds, onExpire })` — local state initialised from `seconds`, `setInterval` every 1 s, renders `MM:SS` with `pad2`, calls `onExpire` once when it reaches 0. Key it by `index` so it re-initialises per question from the server's `remainingSeconds` (which is computed from `startedAt`, so reload keeps the remaining time — Review Focus 4).
- Submit (`Next →` or `Submit answers` on the last question, classes per INV): `const r = await whiteTest.answer(certId, selected)`; `'next'` → bump `step` state to refetch the next question and clear the selection; `'submitted'` → navigate to the result. `ApiError(400)` → show `Please select an answer to continue.` as the v1 error notice (inline style `marginBottom: 12`).
- `onExpire` → `whiteTest.answer(certId, selected)` (the mock ignores the answer once the time is up) → navigate to the result.
- Title `White Test — In progress`.

- [ ] **Step 3: Result** (`white-test-result.php` lines 38–108, INV §white-test-result)

- `useAsync(() => whiteTest.result(certId), [certId])`; `null` → `` <Navigate to={`/white-test/${certId}`} replace /> ``; 404 → `/certifications`.
- Title `White Test — Result`. Score `{correct} / {total}`, `{pct} %`, pass/fail badge, `Passing score: 70 %`, per-question review with `.wt-pick.is-correct|is-wrong|is-missing` and `— no answer —`.
- Passed → `Final exam →` (`/final-exams`) + `Back to dashboard` (`/dashboard`). Failed → `Retake exam` button: `await whiteTest.start(certId)` then navigate to `/take`; + `Back to dashboard`.

- [ ] **Step 4: Verify (Review Focus 4)**

As user2: course → white test row → intro → Start → answer B, C, A, C, D → result `5 / 5`, `100 %`, Passed. Retake, answer wrong twice → `3 / 5`, `60 %`, `✗ Not passed`, Retake button works. Next without a choice → error text. Reload mid-test → same question, timer continues (not reset to 10:00). Timer expiry: in DevTools run
`const d = JSON.parse(localStorage['tekup-v2-mock-db']); d.tables.whiteTests[0].startedAt -= 595000; localStorage['tekup-v2-mock-db'] = JSON.stringify(d)` then reload `/take` → within ~5 s lands on the result. As user1 (33 %) `/white-test/27` → redirected to `/course/27`. Enroll user2 in PCEP, then force progress 100 in storage the same way (`userCertifications` row `progress = 100`) → PCEP intro shows `No white test available yet.`

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): white test intro, quiz and result pages"
```

---

### Task 10: Final exams and Profile

**Files:**
- Modify (replace stubs): `src/pages/portal/FinalExams.tsx`, `src/pages/portal/Profile.tsx`

**Interfaces:**
- Consumes: `vouchers.listReady/request`, `profile.get/update/updatePhoto`, `FeFlash`, `Notice`, `plural`.

- [ ] **Step 1: Final exams** (`final-exams.php` lines 69–175, INV §final-exams)

- Title `Final Exam Vouchers — TEK-UP`. Rows from `listReady()` with the seal icon, tags and action per voucher status exactly as INV. Row WOW delay `0.15 + 0.08 * i` s.
- `Request voucher →` / `Request again →` → `await vouchers.request(id)` → `setSearchParams({ flash: 'requested' })` and `reload()`. Button disabled while busy.
- `?flash=requested` → `<FeFlash icon="fa-paper-plane">Voucher request submitted — our certifications office will email you within one business day.</FeFlash>`.
- Empty state per INV with `View my certifications →` → `/certifications`.

- [ ] **Step 2: Profile** (`profile.php` lines 127–264, INV §profile)

- Title `Profile — TEK-UP Certified Students`. Avatar: `data.photo` as `<img alt="Profile photo">` else the `fa-user` icon. Name `{first last}` or `Student`; `TEK-UP &middot; {studentId}`; stats `Certifications earned` = `earnedCount`, `Member since` = `memberSince`; `Change password &rarr;` `href="#"`.
- Photo: hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`; `onChange` → `profile.updatePhoto(file)` immediately (v1 auto-submits) → notice + `reload()`; errors → error notice. Reset the input value afterwards so the same file can be chosen again.
- Form: disabled First name / Last name / Email / Student ID; editable Phone (`type="tel"`, placeholder `+216 70 250 000`) and Address (placeholder `Street, city, country`), initialised from data. `Save changes` → `profile.update({ phone, address })` → `Profile saved.` notice. `Cancel` → `/dashboard`.
- Notices render as `<Notice>` where v1 renders them (no redirect).

- [ ] **Step 3: Verify**

As user2: final exams lists PCAP with `Course complete` → Request voucher → flash + `Voucher requested` (disabled). As user1: empty state. Profile: `TU-00001`, save phone/address → `Profile saved.`, persisted after reload; upload a small PNG → `Photo updated.` and shows; a > 1 MB file → `The file is too large (max 1 MB).`; a `.gif` → `Unsupported format. Use JPG, PNG or WEBP.`

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): final exam vouchers and profile pages"
```

---

### Task 11: Admin – dashboard and vouchers

**Files:**
- Modify (replace stubs): `src/pages/admin/AdminDashboard.tsx`, `src/pages/admin/AdminVouchers.tsx`

**Interfaces:**
- Consumes: `stats.adminDashboard`, `vouchers.listAll/setStatus`, `VoucherMailto`, `Modal`, `FeFlash`, `formatDateTime`, `plural`.

- [ ] **Step 1: Admin dashboard** (`admin-dashboard.php` lines 24–98, INV §admin-dashboard)

Title `Admin Dashboard — TEK-UP`. Four `Link.dash-card-link` cards with the exact strings and `plural()` rules; links `/admin/vouchers`, `/admin/stats`, `/admin/news`, `/admin/messages`.

- [ ] **Step 2: Vouchers** (`admin-vouchers.php` lines 126–326, INV §admin-vouchers)

- Title `Voucher Requests — Admin`. `filter` from `?filter=` (`all|pending|approved|rejected`, else `all`); chips with counts.
- Rows per INV; `Requested by <strong>{name}</strong> &lt;{email}&gt; &middot; {formatDateTime(requestedAt)}` (name falls back to email).
- Pending: `Approve →` opens the approve modal (v1 lines 259–298 markup: student, cert, code, `Admin password` input auto-focused, cleared on open) and `Decline`. Non-pending: `Reset to pending`.
- Actions call `vouchers.setStatus(id, action, password)`. Success → `setSearchParams({ flash: action })` (the filter is dropped, as v1) and keep `mailto` in component state (one-shot: cleared when the flash changes or the page is left). Wrong password → close modal, `setSearchParams({ flash: 'bad_password' })`. Buttons disabled while busy.
- Flash texts: `approve` → `Voucher approved.`; `reject` → `Voucher request declined.`; `reset` → `Status reset to pending.`; `bad_password` → `Incorrect admin password — the voucher was not approved.` (error style). With a pending mailto: `.has-action` variant with `Open the voucher email for <strong>{email}</strong> in your mail client.` and `<a className="wt-btn wt-btn--primary fe-flash__action" href={mailto.href}>Compose voucher email →</a>`.
- Empty state per INV.

- [ ] **Step 3: Verify (Review Focus 5)**

As user2 request a voucher first. As admin: dashboard shows `1 pending request awaiting approval.` (singular), `2 students · 2 active enrolments.`, `1 new message in the inbox.`. Vouchers: Approve with a wrong password → error flash, still pending; with `admin123` → `Voucher approved.` + Compose email link whose `mailto:` contains the subject and body (inspect the href). Decline / Reset work; chip counts update; filters work. Double-click Confirm approval → a single approval. As user2, final exams now shows `Voucher issued`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): admin dashboard and voucher approval pages"
```

---

### Task 12: Admin – messages (list + detail)

**Files:**
- Modify (replace stubs): `src/pages/admin/AdminMessages.tsx`, `src/pages/admin/AdminMessage.tsx`

**Interfaces:**
- Consumes: `messages.list/get/remove/markUnread`, `ConfirmModal`, `FeFlash`, `formatDateTime`, `formatDateAt`.

- [ ] **Step 1: List** (`admin-messages.php` lines 66–157, INV §admin-messages)

- Title `Messages — Admin`. `?filter=` `all|unread|read`; chips with counts. Rows per INV: preview = first 140 chars + `…` if longer; `{email} &middot; {formatDateTime(submittedAt)}`; unread/read tags and icons.
- `View →` → `/admin/messages/{id}`. `Delete` opens `<ConfirmModal title="Delete message" body={`Delete this message from ${fullName}? This cannot be undone.`} confirmLabel="Delete">` → `messages.remove(id)` → `setSearchParams({ flash: 'deleted' })` + `reload()`.
- `?flash=deleted` → `Message deleted.`; `?flash=marked_unread` → `Marked as unread.`
- Empty state per INV.

- [ ] **Step 2: Detail** (`admin-message.php` lines 44–102, INV §admin-message)

- `id` from params; invalid or `ApiError(404)` → `<Navigate to="/admin/messages" replace />`.
- Title `` `Message from ${fullName} — Admin` ``. Avatar initials = uppercase first letter of name + surname; `Received {formatDateAt(submittedAt)}`; tag `Read`; body with newlines → `{message.split('\n').map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>)}`.
- `Reply by email →` → `` href={`mailto:${email}?subject=Re%3A%20your%20message%20to%20TEK-UP`} ``. `Mark as unread` → `messages.markUnread(id)` → `navigate('/admin/messages?flash=marked_unread')`. `Delete` → ConfirmModal → `messages.remove(id)` → `navigate('/admin/messages?flash=deleted')`.
- `messages.get` marks the message read; StrictMode double-invocation in dev is harmless (idempotent).

- [ ] **Step 3: Verify**

As admin: inbox shows the seeded unread message plus any sent in Task 6; opening one marks it read (count updates when going back); Mark as unread works; Delete from list and from detail both work; `/admin/messages/9999` → list. Long message preview is truncated with `…`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): admin message inbox and detail pages"
```

---

### Task 13: Admin – news and statistics

**Files:**
- Modify (replace stubs): `src/pages/admin/AdminNews.tsx`, `src/pages/admin/AdminStats.tsx`

**Interfaces:**
- Consumes: `news.list/upload/remove`, `stats.adminStats`, `ConfirmModal`, `Notice`, `formatDateDot`.

- [ ] **Step 1: News** (`admin-news.php` lines 91–230, INV §admin-news)

- Title `News — Admin`. Intro text with `(max 1 MB)` instead of `(max 5 MB)`; dropzone hint `… up to 1 MB`.
- Dropzone: hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif">`; selected file kept in state; label shows `{name}  ·  {KB} KB` (`Math.round(size / 1024).toLocaleString()`), adds `is-ready`; drag events toggle `is-dragover`; drop sets the file. `Publish image →` disabled until a file is chosen and while busy.
- Upload → `news.upload(file)` → success notice, clear the file, `reload()`; `ApiError` (400 or 507) → error notice.
- Gallery: `Published images <span>{count}</span>`, cards with thumbnail, `formatDateDot(uploadedAt)`, `{Math.round(sizeBytes / 1024)}&nbsp;KB`, `Remove` → `<ConfirmModal body="Remove this image from the homepage? This cannot be undone." confirmLabel="Remove">` → `news.remove(id)` → `Image removed.` notice + `reload()`. Empty state per INV.

- [ ] **Step 2: Statistics** (`admin-stats.php` lines 31–105, INV §admin-stats)

Title `Statistics — Admin`. Five `.admin-stat` tiles with values/notes exactly as INV; top-5 panel rows with `{provider} &middot; {code}`, count, name and bar `style={{ width: `${barPct}%` }}`; `No enrolments yet.` when `top` is empty; the `style="margin-top: 28px"` row → `style={{ marginTop: 28 }}`.

- [ ] **Step 3: Verify (Review Focus 3)**

Upload a small JPG → appears first in the gallery and first in the home page carousel. Remove it → gone from both. Upload a > 1 MB file → `The file is too large (max 1 MB).`; a `.txt` renamed to `.png` is still rejected by MIME type if the browser reports `text/plain` — otherwise accepted (browser-reported type; acceptable for the mock). Quota: upload ~900 KB images repeatedly until the storage error appears → the message `Browser storage is full…` shows, and after a reload the gallery shows only the images that were saved before the error. Stats: numbers match the data (students 2, catalog 40, enrolments, top-5 with PCAP first).

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): admin news gallery and statistics pages"
```

---

### Task 14: README and full verification pass

**Files:**
- Create: `frontend/README.md` (replace the Vite template README)

- [ ] **Step 1: Write `frontend/README.md`**

```markdown
# TEK-UP Certified Students — v2 frontend

React + Vite + TypeScript port of the v1 PHP pages (`../../Project`). It runs without a backend: all data comes from a mock API in `src/api/`, saved in the browser's localStorage.

## Run

    npm install
    npm run dev      # http://localhost:5173
    npm run build    # type-check + production build
    npm run lint

## Demo accounts (mock only)

| Role | Email | Password |
|---|---|---|
| Student (PCAP at 33 %) | user1@tek-up.de | 123456789 |
| Student (PCAP complete) | user2@tek-up.de | 123456789 |
| Admin | admin@tek-up.de | admin123 |

"Reset demo data" in the footer restores the seed.

## Mock API

- `src/api/*.ts` — one module per domain; every function is async and returns the shape the Django API will return. To connect Django, replace the bodies with `fetch('/api/...')`; pages don't change.
- `src/api/db.ts` — in-memory store persisted to localStorage (`tekup-v2-mock-db`).
- `src/api/fixtures.ts` — seed data from `Project/database/tekup.sql` plus demo course content.

## Course videos

Not bundled. See `public/media/README.txt`.

## Differences from v1

See "Known v1 bugs: decisions" in `../docs/superpowers/plans/2026-09-26-frontend-migration.md`.
```

- [ ] **Step 2: Full check (spec §10)**

1. `npm run build` → exit 0. `npm run lint` → 0 errors, 0 warnings.
2. Click `Reset demo data`, then walk through every route of spec §3 as `user1`, as `user2` and as `admin`, running each check from Tasks 6–13 once more. Also: browser back/forward between pages, refresh on every route (Vite dev server serves `index.html` for deep links), mobile width (menu toggle) on one public, one portal and one admin page.
3. Compare the look of each page with v1 (XAMPP, if available); note any visual difference that is not in the "Known v1 bugs" table and fix it.
4. `git status` clean except ignored files.

- [ ] **Step 3: Commit**

```bash
git add frontend/README.md
git commit -m "docs(frontend): README with run instructions and demo accounts"
```
