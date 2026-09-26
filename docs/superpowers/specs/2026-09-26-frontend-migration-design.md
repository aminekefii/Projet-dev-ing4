# Frontend migration: v1 PHP pages → React (Vite + TypeScript)

Date: 2026-09-26
Status: approved design, awaiting spec review
Location of the app: `Project_v2/frontend/`
Source: `Project/` (v1, PHP/MySQL)

## 1. Goal

Rebuild every user-facing page of v1 as a React single-page app so that it
looks and behaves like v1, runs without a backend, and can later be wired to
the Django REST API by changing only the API layer.

Success criteria:

- Every in-scope v1 page (section 3) has a React route that looks like v1
  and supports the same actions.
- The app runs with `npm run dev` and needs no PHP, MySQL or Django.
- `npm run build` (which runs the TypeScript check) and `npm run lint` pass
  with no errors.
- Pages never read fixtures or `localStorage` directly; they only call
  functions in `src/api/`.

Out of scope: the Django backend, Docker, automated tests, a visual redesign,
Tailwind/MUI, TanStack Query.

## 2. Stack

| Concern | Choice |
|---|---|
| Build tool | Vite, `react-ts` template |
| Language | TypeScript, `strict` mode |
| Routing | React Router (`react-router-dom`) |
| Lint | ESLint (Vite template config) |
| Styling | v1 CSS files copied as-is (see section 5) |

No other runtime dependencies. jQuery, owl-carousel, WOW.js, isotope and
imagesloaded are not used.

## 3. Pages in scope

| v1 file | React route | Layout |
|---|---|---|
| `index.php` | `/` | Public |
| `contact.php` | `/contact` | Public (portal nav when a student is logged in, as in v1) |
| `login.php` | `/login` | Public |
| `dashboard.php` | `/dashboard` | Portal |
| `catalog.php` | `/catalog` | Portal |
| `certifications.php` | `/certifications` (`?filter=` kept) | Portal |
| `course.php` | `/course/:certId` | Portal |
| `white-test.php` | `/white-test/:certId` | Portal |
| `white-test-take.php` | `/white-test/:certId/take` | Portal |
| `white-test-result.php` | `/white-test/:certId/result` | Portal |
| `final-exams.php` | `/final-exams` | Portal |
| `profile.php` | `/profile` | Portal |
| `admin-dashboard.php` | `/admin` | Admin |
| `admin-vouchers.php` | `/admin/vouchers` | Admin |
| `admin-messages.php` | `/admin/messages` | Admin |
| `admin-message.php` | `/admin/messages/:id` | Admin |
| `admin-news.php` | `/admin/news` | Admin |
| `admin-stats.php` | `/admin/stats` | Admin |

Not migrated as pages:

- `stream.php`, `subtitle.php`, `progress.php`, `logout.php`: their logic
  becomes mock API functions (`courses`, `progress`, `auth.logout`).
- `import-course.php`: a server-side import tool; belongs to the backend.
- `index.html`: leftover template demo page.

Any unknown route shows a 404 page.

## 4. Project structure

```
frontend/
  public/assets/images/...      copied from Project/assets/images (same paths)
  public/media/                 empty; optional sample .mp4/.vtt for manual testing
  src/
    main.tsx                    imports styles, mounts <App/>
    App.tsx                     router + AuthProvider
    styles/                     bootstrap.min.css, templatemo-space-dynamic.css,
                                animated.css, fontawesome.css, fonts/, app.css
    api/
      types.ts                  types mirroring tekup.sql
      fixtures.ts               seed data
      db.ts                     localStorage-backed mock store
      errors.ts                 ApiError
      auth.ts certifications.ts courses.ts progress.ts whiteTest.ts
      vouchers.ts messages.ts news.ts profile.ts stats.ts
      index.ts                  re-exports
    auth/
      AuthContext.tsx           AuthProvider, useAuth()
      RequireRole.tsx           route guard
    layouts/
      PublicLayout.tsx PortalLayout.tsx AdminLayout.tsx
    components/
      Header.tsx                shared header; nav links passed in per layout
      Footer.tsx Preloader.tsx Carousel.tsx ...
    pages/
      public/  portal/  admin/  NotFound.tsx
    hooks/
      useAsync.ts               loading / error / data for api calls
```

Each page file stays focused on one screen. Pieces reused by several pages
(certificate card, progress bar, flash message, etc.) go in `components/`.

## 5. Styling and template behaviour

- CSS files are copied from `Project/assets/css` and `Project/vendor/bootstrap`
  and imported once in `main.tsx`. Inline `<style>` blocks found in v1 pages
  move to `src/styles/app.css` (or a page-level CSS file when page-specific).
- Images live in `public/assets/images/` so `src=` paths match v1.
- The Poppins font link from `includes/head.php` goes in `index.html`.
- Template JavaScript is replaced with React:
  - mobile menu toggle (`.menu-trigger`) → state in `Header`
  - sticky header on scroll → scroll listener in `Header`
  - preloader → `Preloader`, hidden after the first render
  - owl-carousel (news on the home page) → `Carousel` component with
    previous/next controls and auto-advance
  - WOW.js scroll animations → the same `animated.css` classes applied
    directly, so they play on page load
- Page titles (`$page_title` in v1) are set with `document.title` per page.

## 6. Mock API

### Contract

- Every function is `async` and returns plain typed data, the shape the
  Django API is expected to return.
- Failures throw `ApiError { status, message }` (401 not logged in,
  403 forbidden, 404 not found, 400 validation), matching future HTTP errors.
- A short artificial delay (~150 ms) makes loading states visible.
- Pages call the API through `useAsync` (or directly in event handlers for
  actions) and show a loading state and an error message.

### Store

- `db.ts` holds all tables in one object, seeded from `fixtures.ts` and saved
  to `localStorage` under one versioned key after every write.
- If the stored data is missing, cannot be parsed or has an older version,
  the store reseeds from fixtures.
- `resetDemoData()` restores the seed; it is exposed as a small link in the
  footer.

### Seed data (`fixtures.ts`)

Copied from `Project/database/tekup.sql`: users (plus one admin user with the
`admin` role), profiles, certifications, user_certifications, course_sections,
course_videos, voucher_requests, contact_messages. Also the PCAP question
bank from `includes/white-test-questions.php` and the file names in
`assets/images/news/`.

### Functions (by module)

| Module | Functions | v1 origin |
|---|---|---|
| `auth` | `login(email, password)`, `logout()`, `currentUser()` | login.php, logout.php |
| `certifications` | `listCatalog()`, `listMine(filter)`, `enroll(certId, password)`, `cancel(certId)` | catalog.php, certifications.php |
| `courses` | `getCourse(certId)` (sections, videos, watched flags, video/subtitle URLs) | course.php, stream.php, subtitle.php |
| `progress` | `markWatched(videoId)` → new course % | progress.php |
| `whiteTest` | `start(certId)`, `current(certId)`, `answer(certId, choice)`, `result(certId)` | white-test*.php |
| `vouchers` | `listReady()`, `request(certId)`, admin: `listAll()`, `setStatus(id, action)` (approve / reject / reset) | final-exams.php, admin-vouchers.php |
| `messages` | `send(form)`, admin: `list()`, `get(id)` (marks read) | contact.php, admin-message(s).php |
| `news` | `list()`, admin: `upload(file)`, `remove(id)` | index.php, admin-news.php |
| `profile` | `get()`, `update(fields, photo?)` | profile.php |
| `stats` | `dashboard()`, `adminDashboard()`, `adminStats()` | dashboard.php, admin-dashboard.php, admin-stats.php |

The same rules v1 checks on the server are checked inside these functions
(e.g. voucher request only when progress is 100%, course access only when
enrolled, admin functions only for the admin role).

## 7. Authentication

- `AuthProvider` loads `currentUser()` on start and exposes
  `user`, `login`, `logout` through `useAuth()`.
- The session is kept in the mock store (`localStorage`), so a refresh keeps
  the user logged in.
- `RequireRole role="student" | "admin"` wraps each protected layout:
  - not logged in → redirect to `/login`
  - wrong role → redirect to that role's home (`/dashboard` or `/admin`),
    as `auth-admin.php` does
- `/login` redirects a logged-in user to their home, as in v1.
- There is no `admin@admin` shortcut: the admin is a seeded user with the
  `admin` role. Mock passwords are demo-only and documented in the README.

## 8. Behaviour carried over from v1

- Catalog: enrolment requires re-entering the password.
- My certifications: filter tabs, cancel enrolment, continue to course.
- Course player: section/video list, click to load a video without reload,
  subtitles track, a video is marked watched once playback passes 90%
  (once per load), progress bar updates.
- White test: start → one question at a time → result with score. State is
  kept in the mock store instead of the PHP session.
- Final exams: lists courses at 100%, request voucher, shows request status.
- Profile: edit phone and address, upload avatar (image types only, size
  limit 1 MB, see below), stored as a data URL.
- Contact: the form creates a message that appears unread in the admin inbox;
  for a logged-in student the name and email fields are pre-filled and locked.
- Admin: vouchers approve / reject / reset; messages list and detail
  (opening marks read, reply with a `mailto:` link as in v1); news upload and
  delete (stored as data URLs); dashboard and stats numbers computed from
  the store.

Deliberate differences from v1:

- A certification without a question bank (e.g. PCEP) shows
  "No white test available yet" instead of failing.
- No hard-coded admin login.
- Image uploads (avatar, news) are limited to 1 MB instead of v1's 5 MB,
  because they are stored in `localStorage` (about 5 MB quota in total).
  The limit goes back to 5 MB when the real API exists.
- Videos: no media files are bundled. Video and subtitle URLs point to
  `/media/<cert>/<section>/<file>`; without a file the player shows the
  browser's normal "cannot play" state. A sample file placed in
  `public/media/` can be used to test the player.

## 9. Error handling

- `useAsync` returns `{ data, loading, error }`; pages render a loading
  placeholder and an inline error box using v1's alert styles.
- A 404 from the API (e.g. unknown `certId`) shows the NotFound page;
  a 403 on a course (not enrolled) redirects to `/catalog`, as v1 does.
- Form validation messages reuse v1's wording.

## 10. Verification

No automated tests in this step (decided). Before calling the work done:

1. `npm run build` passes (includes `tsc`).
2. `npm run lint` passes.
3. Run the dev server and click through every route in section 3, once as a
   student and once as the admin, checking each action in section 8 and
   comparing the look with v1.

## 11. Later (not in this step)

- Replace mock function bodies with `fetch('/api/...')` once Django exists.
- Decide whether admin pages stay in React or move to Django admin.
- Tests (Vitest, Playwright), TanStack Query.
