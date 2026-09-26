# v1 PHP app — behaviour inventory (for React + mock API port)

Source: `C:\Users\amine\Desktop\PHP-ing3-main\Project` (read-only). Line numbers refer to those files.
Stack: PHP sessions + PDO/MySQL (`tekup`), Bootstrap **5.0.0-beta2** bundle, jQuery 3.3.1, WOW (animation.js), templatemo "Space Dynamic" theme.

---

## 0. Global conventions

### Session / auth
- `$_SESSION['user']` shape: `{ id:int, email, firstname, lastname, role:'student'|'admin', logged_in_at:int(unix) }`.
- `includes/auth.php`: if no `$_SESSION['user']` -> redirect `login.php`.
- `includes/auth-admin.php`: auth.php + if `role !== 'admin'` -> redirect `dashboard.php`.
- Admin is a **synthetic** user: `{id:0, email:'admin@tek-up.local', firstname:'Administrator', lastname:'', role:'admin'}` (no DB row).
- Student pages only use `auth.php` (no "not-admin" guard) except `dashboard.php` which bounces admins to `admin-dashboard.php`. Admin (id 0) can therefore open catalog/certifications/course/final-exams/profile; profile.php finds no user row -> `session_destroy()` -> `login.php` (admin gets logged out).

### Page shell
- `includes/head.php`: `<title>` = `$page_title` (default `TEK-UP Certified Students`), meta description = `$page_description` (default `TEK-UP Certified Students portal.`), both passed through `htmlspecialchars`. Loads Google Font Poppins 100–900, `vendor/bootstrap/css/bootstrap.min.css`, `assets/css/fontawesome.css`, `templatemo-space-dynamic.css`, `animated.css`, `owl.css`. Opens `<body>` and renders preloader:
  ```html
  <div id="js-preloader" class="js-preloader"><div class="preloader-inner"><span class="dot"></span><div class="dots"><span></span><span></span><span></span></div></div></div>
  ```
- `includes/footer.php`:
  - `<footer>` > `.container > .row > .col-lg-12.wow.fadeIn[data-wow-duration=1s][data-wow-delay=0.25s]` > `<p>© Copyright {currentYear} TEK-UP University &mdash; Certified Students. All Rights Reserved.<br>Reference: <a rel="nofollow" href="https://tek-up.de/certif/">tek-up.de/certif</a></p>`
  - Scripts (in order): `vendor/jquery/jquery.min.js`, `vendor/bootstrap/js/bootstrap.bundle.min.js`, `assets/js/owl-carousel.js`, `assets/js/animation.js`, `assets/js/imagesloaded.js`, `assets/js/templatemo-custom.js`. (`tabs.js`, `isotope.js` exist but are never loaded.)
- Page-title quirks: `course.php` and `white-test.php` pre-escape the cert name before head.php escapes again (double escaping). `index.php` description contains `&mdash;` which ends up as literal `&amp;mdash;`.

### Flash CSS classes
- `.form-notice.is-success | .is-error | .is-info` (catalog, certifications, contact, profile, admin-news, white-test-take).
- `.fe-flash` (+ `.is-error`, `.has-action`) (final-exams, admin-vouchers, admin-messages).
- `.login-error` (login only).

### Date formats (PHP `date`)
- `d M Y` -> `26 Sep 2026` (certifications earned/enrolled).
- `d M Y, H:i` -> `26 Sep 2026, 14:05` (admin-vouchers, admin-messages list).
- `d M Y \a\t H:i` -> `26 Sep 2026 at 14:05` (admin-message detail).
- admin-news uses `date('d M Y &middot; H:i', mtime)` — **bug**: `m,i,d,d,o,t` inside `&middot;` are format chars, output e.g. `26 Sep 2026 &09052626202630; 14:05`, then htmlspecialchars'd so it shows literally. Intended: `26 Sep 2026 · 14:05`.

### Data model (database/tekup.sql)
- `users(id, email UNIQUE, password PLAINTEXT, firstname NULL, lastname NULL, created_at)`. Seeds: `user1@tek-up.de`/`123456789` (User One), `user2@tek-up.de`/`123456789` (User Two).
- `profiles(user_id PK/FK, phone NULL, address NULL, photo NULL, updated_at)`. Seeded empty rows for users 1,2.
- `certifications(id, code UNIQUE, name, provider, category ENUM('technical','linguistic','other'), description, media_path NULL (added by ALTER), created_at)`. 40 seeded rows (32 technical, 3 linguistic, 5 other).
- `user_certifications(id, user_id, certification_id, status ENUM('in_progress','earned') default in_progress, progress TINYINT 0..100, enrolled_at, earned_at NULL)`, UNIQUE(user_id, certification_id).
- `course_sections(id, certification_id, position, title, folder)`, UNIQUE(cert, position).
- `course_videos(id, section_id, position, title, filename, subtitle_filename NULL, duration_seconds NULL)`, UNIQUE(section, position).
- `video_progress(user_id, video_id, watched_at)`, PK(user_id, video_id).
- `voucher_requests(id, user_id, certification_id, status ENUM('pending','approved','rejected') default pending, requested_at)`, UNIQUE(user_id, certification_id).
- `contact_messages(id, name, surname, email, message TEXT, status ENUM('unread','read') default unread, submitted_at)`.
- **ENUM ordering matters**: MySQL sorts ENUM by declaration index, not alphabetically: category technical<linguistic<other; uc.status in_progress(1)<earned(2).
- Nothing in the app ever sets `user_certifications.status='earned'` or `earned_at`; only seed/manual data can.

### Shared formulas
- **Featured / enrollable certs** (catalog.php): order all certs by `category` (ENUM index: technical, linguistic, other), then `code='PCEP'`→0, `code='PCAP'`→1, else 2, then `provider` ASC, then `code` ASC; take the **first 3**. With seed data = **PCEP, PCAP, AWS-CLF** (provider "Amazon AWS" sorts first). Only these 3 have an Enroll button; all others show Locked.
- **Course progress %** (progress.php rollup): `round(100 * watchedVideosOfCert / totalVideosOfCert)` (all videos across all sections of that cert for that user; 0 if no videos). Stored in `user_certifications.progress`. Client JS in course.php computes the same locally from ticked rows.
- **Video counts as watched** when `currentTime/duration >= 0.9` (client), POSTed once per load.
- **Student ID**: `'TU-' + str_pad(user.id, 5, '0', LEFT)` -> `TU-00001`.
- **"Ready for exam"**: `user_certifications.progress >= 100` (white test result is not persisted; not required server-side).
- White test: 600 s limit, 5 questions, pass mark `pct >= 70`.

---

## 1. Nav includes

### includes/nav-public.php
Vars: `$header_extra` (default `''`, login.php sets `' background-header'`), `$public_active` (default `'home'`). Only `home` key is ever matched (login sets `'login'`, contact sets `'contact'` -> nothing active).
Header: `<header class="header-area header-sticky{header_extra} wow slideInDown" data-wow-duration="0.75s" data-wow-delay="0s">`. Logo `index.php`, img `assets/images/logo1.png` alt `TEK-UP Certif`, `<h4>TEK-UP<span> Certified Students</span></h4>`.
| Label | Target | li class |
|---|---|---|
| Home | `index.php#top` (active when home) | scroll-to-section |
| About | `index.php#about` | scroll-to-section |
| News | `index.php#news` | scroll-to-section |
| Certifications | `index.php#services` | scroll-to-section |
| Categories | `index.php#portfolio` | scroll-to-section |
| Endorsements | `index.php#blog` | scroll-to-section |
| Contact | `index.php#contact` | scroll-to-section |
| Login (in `.main-red-button`) | `login.php` | — |
Plus `<a class='menu-trigger'><span>Menu</span></a>`.

### includes/nav-portal.php
`$active` key. Header class `header-area header-sticky background-header wow slideInDown`. Logo `index.php`, alt `TEK-UP Certif`, `TEK-UP<span> Certified Students</span>`.
| Label | Target | active key |
|---|---|---|
| Dashboard | dashboard.php | dashboard |
| My Certifications | certifications.php | certifications |
| Profile | profile.php | profile |
| Contact | contact.php | contact |
| Sign Out (`.main-red-button`) | logout.php | — |
No link to catalog.php or final-exams.php (final-exams sets `$active='final-exams'`, which matches nothing).

### includes/nav-admin.php
Header class same as portal. Logo `admin-dashboard.php`, alt `TEK-UP Admin`, `TEK-UP<span> Admin Console</span>`.
| Label | Target | active key |
|---|---|---|
| Dashboard | admin-dashboard.php | admin-dashboard |
| Vouchers | admin-vouchers.php | admin-vouchers |
| Statistics | admin-stats.php | admin-stats |
| News | admin-news.php | admin-news |
| Messages | admin-messages.php | admin-messages |
| Sign Out (`.main-red-button`) | logout.php | — |

Active link rendered as `class="active"` on the `<a>`.

---

## 2. Pages

### index.php (public landing)
1. Markup 9–423 (footer at 425). Nav: **nav-public** (no header_extra -> transparent header until scroll). `$page_title='TEK-UP Certified Students'`, description `TEK-UP University Certified Students &mdash; Excellence & Savoir-Faire.`
   - Sections: `#top` banner 9–43 (h6 `Welcome to TEK-UP University`, h2 `We place <em>great emphasis</em> on <span>knowledge</span> &amp; <span>expertise</span>`, `.pillars` list, `.hero-social` "Check us out" FB `https://www.facebook.com/profile.php?id=100070946543328`, LinkedIn `https://www.linkedin.com/school/tek-up-university/posts/?feedView=all`); `#about` 45–105 (4 items: Savoir / Savoir-Faire / 1,400+ Certifications / Global Placements); `#news` 107–168 (conditional); `#services` 196–238 (static skill bars CCNP 90%, AWS CSAP 85%, OSCP 78%); `#portfolio` 240–304 (4 static tracks, links `#`); `#blog` 306–373 (endorsements, partner images); `#contact` 375–423 (form).
2. Data: no SQL. News images = every file in `assets/images/news/` matching jpg/jpeg/png/webp/gif (any case), sorted by **file mtime DESC**. Section `#news` hidden entirely if zero images; indicators + prev/next only if >1. Heading `<em>News</em> &amp; <span>Achievements</span>`, subtitle `Our latest students achievements`. Image `src=assets/images/news/{rawurlencode(name)}`, alt `TEK-UP student achievement`. Mock API: needs a `GET news images` list (name/url, mtime) shared with admin-news.
3. Actions: contact form `#contact` POSTs to **contact.php** (fields name, surname, email, message; all `required`; button `Send Message`). No server logic here.
4. Query params: none.
5. Script 170–194 (only if >1 image): starts `bootstrap.Carousel` with interval 3500, pause false, wrap true, touch true, on DOMContentLoaded/tick and on window load. **Note**: calls `bootstrap.Carousel.getOrCreateInstance`, which does not exist in the bundled Bootstrap 5.0.0-beta2 -> throws; carousel still auto-cycles via `data-bs-ride="carousel" data-bs-interval="3500" data-bs-pause="false" data-bs-wrap="true"`. No Owl carousel is used anywhere.
6. Access: public.

### contact.php
1. Markup 69–142. Nav: **nav-portal if logged in, else nav-public**. Title `Contact — TEK-UP Certified Students`.
   Heading: h6 `Certified Students Portal`, h2 `Talk to the <em>Certifications</em> <span>Office</span>`, p `Use the form below to reach the Certifications Office. We answer within one business day.`, phone `Certifications Office: +216 70 250 000`.
2. Data: INSERT `contact_messages(name[≤100], surname[≤100], email[≤255], message)` (status default unread, submitted_at now). Values truncated with mb_substr.
3. POST: 
   - Logged in: name/surname/email taken **from session** (firstname/lastname/email, trimmed), POST values ignored; inputs rendered `disabled` and prefilled. Logged out: from POST, trimmed; inputs `required`.
   - message = trim(POST message).
   - Validation order: any of 4 empty -> `Please fill in all fields.`; invalid email -> `Please enter a valid email address.`
   - Success -> redirect `contact.php?sent=1` (PRG). Error re-renders with values preserved.
   - Consequence: admin (lastname `''`) always gets `Please fill in all fields.`
4. `?sent=1` -> success notice `Thanks &mdash; your message has been received. The Certifications Office will reply within one business day.`
5. No script/style.
6. Public. Logged-in banner: `Signed in as <strong>{First Last}</strong> — your details are filled in below.` (icon `fa-user-circle`, class `.contact-signed-in`). Button `Send Message`.

### login.php
1. Markup 69–127. Nav: **nav-public** with `header_extra=' background-header'`. Title `Sign In — TEK-UP Certified Students`.
   Left: h6 `Certified Students Portal`, h2 `Welcome <em>back</em> to your <span>Certifications</span> dashboard`, p `Track your enrolment, schedule exam sessions, and download every certificate earned along your TEK-UP journey &mdash; from Cisco to AWS, Microsoft, OffSec and beyond.`, pillars `1,400+ certifications issued to TEK-UP students.` / `Weekly proctored exam slots across 17+ global vendors.`
   Card: h3 `Sign in`, p `Use your TEK-UP credentials to continue.`, labels `Email` (placeholder `you@tek-up.de`) / `Password` (placeholder 8 bullets), `Remember me` checkbox (ignored), `Forgot password?` (href `#`), button `Sign In`, line `Not a student yet? <a href="index.php#contact">Talk to the Certifications Office &rarr;</a>`.
2. Data: lookup user by exact email (id, email, password, firstname, lastname); plaintext compare (`hash_equals`).
3. POST email (trimmed), password (not trimmed). Order:
   1. either empty -> `Please enter both email and password.`
   2. email === `admin@admin` && password === `admin` -> set admin session -> redirect `admin-dashboard.php` (no email-format check).
   3. invalid email format -> `Please enter a valid email address.`
   4. no user / wrong password -> `Invalid email or password.`
   5. success -> session role `student` -> redirect `dashboard.php`.
   Email value re-filled on error.
4. None. 5. None.
6. If already logged in: admin -> `admin-dashboard.php`, else `dashboard.php`.

### logout.php
Clears session + cookie, redirect `index.php`. No markup.

### dashboard.php
1. Markup 42–89. Nav: **nav-portal**, active `dashboard`. Title `Dashboard — TEK-UP Certified Students`.
2. Data:
   - display_name = session firstname ?? (email local part) ?? email. user_email = session email ?? `Student`.
   - earned = count user_certifications where user & status earned; in_progress = count status in_progress.
   - exam_ready = count user_certifications where user & progress >= 100.
   Markup strings: h6 `Certified Students Portal`; h2 `Welcome <em>back</em>, <span>{display_name}</span>`; p `You are signed in as {email}. Track your certifications, exam schedule and profile from here.`
   Cards: `My Certifications` / `{earned} earned &middot; {in_progress} in progress` / link `View all &rarr;` -> certifications.php. `Final Exams` / if ready>0 `{n} course{s} ready for the official exam.` else `Finish a course to unlock voucher requests.` / `Request a voucher &rarr;` -> final-exams.php. `Profile` / `Manage your TEK-UP credentials.` / `Edit profile &rarr;` -> profile.php. Icons fa-certificate, fa-calendar, fa-user.
3. No actions. 4. None. 5. None.
6. auth; admin -> `admin-dashboard.php`.

### catalog.php
1. Markup 116–184; enroll modal 186–217; script 219–242. Nav: **nav-portal**, active `certifications`. Title `Catalog — TEK-UP Certified Students`.
   Header: h6 `Certifications Catalog`, h2 `Pick a <em>track</em> &amp; <span>start your journey</span>`, p `All certifications are included in your TEK-UP tuition. Enroll in one to add it to your dashboard and start preparing.`, back-link `Back to my certifications` -> certifications.php.
2. Data:
   - All certs (id, code, name, provider, category, description) in featured ordering (see §0), grouped into `technical`→`Technical Certifications`, `linguistic`→`Linguistic Certifications`, `other`→`Other Certifications`; empty groups skipped. Group heading shows `<span class="cat-count">{count}</span>`.
   - enrolled_ids = cert ids in user_certifications for user.
   - featured_ids = first 3 of ordered list.
   - Card: `.catalog-card` (+`.is-enrolled`), `.cat-provider`, `.cat-code`, h4 name, p description. Action: enrolled -> `<span class="enrolled-pill"><i class="fa fa-check"></i> Enrolled</span>`; featured -> button `Enroll &rarr;` (opens modal, data-cert-id/name/code); else disabled `.enroll-btn.is-locked` `<i class="fa fa-lock"></i> Locked`, title `Not open for enrolment yet`.
   - WOW delay starts 0.15s, +0.05 per card, capped 0.6s, reset per group.
3. POST (`cert_id`, `password`) — **no PRG**, flash rendered inline. Order:
   1. cert_id not in featured 3 -> `That certification is not currently open for enrolment.` (error)
   2. password empty -> `Please enter your password to confirm the enrolment.` (error)
   3. password != users.password for session user -> `Wrong password. Enrolment cancelled.` (error)
   4. cert not found -> `That certification could not be found.` (error)
   5. insert user_certifications (status in_progress, progress 0); if new -> `Enrolled successfully. The certification is now in progress on your dashboard.` (success); if already existed -> `You are already enrolled in that certification.` (**info**)
   6. DB exception -> `Enrollment failed. Please try again.` (error)
   Flash: `<div class="form-notice is-{type}">`.
   Modal: h4 `Confirm enrolment`; p `You are about to enroll in <strong id="enrollCertName">—</strong> <span class="enroll-cert-code">({code})</span>. Please enter your password to confirm.`; password placeholder `Your password`; buttons `Confirm enrolment` (submit, `.main-button`) / `Cancel` (`.cancel-link`, dismiss). Icon fa-lock.
4. None.
5. Script: on `show.bs.modal` copy data-cert-id/name/code into hidden input + text (code wrapped in parentheses); on `shown` focus password; on `hidden` clear password.
6. auth only.

### certifications.php (My Certifications)
1. Markup 83–183; onboarding modal 185–210 (+script 202–209, only when empty); cancel modal 212–232; script 234–249. Nav: **nav-portal**, active `certifications`. Title `My Certifications — TEK-UP Certified Students`.
   Header: h6 `Certified Students Portal`, h2 `My <em>Certifications</em> &amp; <span>Tracks</span>`, p `Every certificate you have earned, every exam in progress, and the tracks still open to you at TEK-UP.`
2. Data:
   - User certs joined with certs: id, code, name, provider, description, status, progress, enrolled_at, earned_at; ordered **status DESC (earned first, ENUM index)**, then enrolled_at DESC.
   - counts earned / in_progress (from that list). catalog_size = count(certifications). available = max(0, catalog_size − userCertCount).
   - Stat strip: earned and in_progress zero-padded to 2 digits (`03`), captions `Earned`, `In progress`; third `{available}+` caption `Available tracks`.
   - Filter chips (hidden when empty): `All` / `Earned` / `In progress` -> `certifications.php?filter=all|earned|in_progress`, active `.is-active`; plus `.catalog-chip` `<i class="fa fa-plus"></i> Enroll in more` -> catalog.php. Filtering is client-of-server (skip rows not matching); stats are not filtered.
   - Card `.cert-card`: `.cert-provider`, `.cert-status.is-earned|is-progress` text `Earned`/`In progress`, h4 name, p description. In progress: `.cert-progress` bar width `{progress}%` + label `{progress}%`. Meta: earned -> `Earned {d M Y}` + `View certificate &rarr;` (href `#`); in progress -> `Enrolled {d M Y}` + `Continue &rarr;` -> `course.php?cert={id}` + `Cancel` button (opens cancel modal). WOW delay 0.2 +0.1 per card (uncapped).
   - Empty state: icon fa-certificate, h3 `No certifications yet`, p `You have not enrolled in any certification. Browse the TEK-UP catalog to get started.`, `Start Enrolling` -> catalog.php.
   - Onboarding modal (auto-shown **every visit** while empty, backdrop static): h4 `Get started with your first certification`, p `You don't have any certifications yet. Pick one from the TEK-UP catalog — {catalog_size} tracks across Cisco, AWS, Red Hat, Microsoft, Python, IELTS and more.`, buttons `Start Enrolling` (catalog.php) / `Maybe later` (dismiss). Icon fa-graduation-cap.
3. POST `cancel_cert_id` — **no PRG** (form action keeps `?filter=` when not all). Deletes user_certifications row for user+cert **only if status in_progress** (video_progress and voucher rows are NOT deleted).
   - deleted -> `Enrolment cancelled.` (success); nothing deleted -> `That enrolment could not be cancelled.` (error); exception -> `Could not cancel the enrolment. Please try again.` (error).
   Cancel modal: icon fa-exclamation-triangle, h4 `Cancel this enrolment?`, p `You are about to cancel your enrolment in <strong>{name}</strong> ({code}). Your progress will be lost. You can re-enroll later from the catalog.`, buttons `Yes, cancel enrolment` (`.main-button.danger`) / `Keep my enrolment`.
4. `?filter=` in {all, earned, in_progress}; anything else -> all.
5. Scripts: onboarding modal `new bootstrap.Modal(el).show()` on DOMContentLoaded; cancel modal populates hidden id/name/code on `show.bs.modal`.
6. auth only.

### course.php
1. Markup 93–194; script 196–335 (only when content and a video exist). Nav: **nav-portal**, active `certifications`. Title `{cert name} — TEK-UP Certified Students`.
2. Data:
   - Enrolment row (progress) for user+cert; cert (id, code, name, provider, media_path).
   - has_content = media_path non-empty.
   - Sections of cert ordered by position with `total` = video count and `watched` = count of user's video_progress rows in section.
   - Videos (id, section_id, position, title, duration_seconds, watched bool) ordered section.position, video.position.
   - initial video = first unwatched in order; if all watched, the **last** video.
   Markup: back-link `Back to my certifications`; `.course-head` h6 `{provider} &middot; {code}`, h2 name, bar `#courseBar` width progress%, label `<span id="courseProgressLabel">{progress}</span>% complete`.
   - No content: h3 `Content not yet uploaded`, p `The course material for this certification will be available soon. Check back later.`, button `Back` -> certifications.php.
   - Rail (`.col-lg-4.course-rail`): per section `<details class="course-section">` (open if it contains the initial video), summary `{position}. {title}` + `.sec-count[data-section-id]` `{watched}/{total}`; rows `li.course-video-row[data-video-id][data-video-title][data-section-id]` (+`.is-playing` for initial), `.status-mark` = `✓` if watched, `▶` if initial, else empty; `.video-title`.
   - Final rail row `a#whiteTestLink.white-test-row` (`.is-locked` unless progress>=100): text `{sectionCount+1}. Pass white test`, icon fa-trophy (unlocked, href `white-test.php?cert={id}`) or fa-lock (locked, href `#`, `aria-disabled`).
   - Stage: `<video id="coursePlayer" controls preload="metadata" data-video-id>` with `<source src="stream.php?video_id={id}" type="video/mp4">` and `<track id="courseSubtitle" kind="subtitles" src="subtitle.php?video_id={id}" srclang="en" label="English" default>`; fallback text `Your browser does not support HTML5 video.`; `.stage-meta` `Now playing` + h4#nowPlayingTitle. If no videos: `No videos in this course yet.`
3. No forms. Background POST to progress.php (see below).
4. `?cert={id}` (int, required).
5. Script: accordion (opening one `<details>` closes others); on `timeupdate` when ≥90% -> markWatched once per loaded video: set `✓`, recompute overall % = round(100·✓rows/allRows) into bar+label, unlock white-test link at ≥100 (remove is-locked/aria-disabled, set href, swap fa-lock→fa-trophy), update section `x/y`, then `fetch('progress.php', POST FormData{video_id})` (response ignored; on network error reset flag). Row click -> loadVideo: swap source + track src, set data-video-id, `video.load()`, update title, move `.is-playing` and `▶` mark, open parent details, `video.play()`. On `ended` -> auto-advance to next row in DOM order.
6. auth; cert<=0 -> certifications.php; not enrolled -> **catalog.php**; cert missing -> certifications.php.

### progress.php (JSON endpoint)
- Must be POST else 405 `{"error":"method_not_allowed"}`. `video_id` <=0 -> 400 `{"error":"bad_request"}`. Video unknown -> 404 `{"error":"video_not_found"}`. User not enrolled in the video's cert -> 403 `{"error":"not_enrolled"}`.
- Side effects: insert video_progress(user, video) idempotently (keeps original watched_at); recompute `user_certifications.progress` = round(100·watched/total) for that cert (COALESCE 0).
- Response `{ ok:true, progress:int, section:{ id, total, watched } }`.
- Auth via auth.php (unauthenticated gets a 302 to login, not JSON).

### stream.php / subtitle.php (media endpoints)
- `GET ?video_id=`. stream: <=0 -> 400 JSON `{"error":"bad_request"}`; unknown -> 404; not enrolled -> 403; path = `MEDIA_ROOT/{cert.media_path}/{section.folder}/{video.filename}` (MEDIA_ROOT `C:/xampp/htdocs/PHP-ing3`), must resolve inside MEDIA_ROOT else 403; missing -> 404. Serves `video/mp4` with `Accept-Ranges: bytes`, supports `Range: bytes=a-b` (206 + Content-Range; 416 if invalid), 1 MB chunks.
- subtitle: same lookup using `subtitle_filename` (404 if null); converts SRT->WebVTT: prefix `WEBVTT\n\n` and replace `HH:MM:SS,mmm` commas with dots; `Content-Type: text/vtt; charset=utf-8`.
- Mock-port note: replace with static sample mp4/vtt URLs; keep enrolment check in mock.

### white-test.php (intro)
1. Markup 55–106. Nav: **nav-portal**, active `certifications`. Title `White Test — {cert name}`.
   back-link `Back to the course` -> `course.php?cert={id}`; h6 `{provider} &middot; {code}`; h2 `White Test &mdash; {name}`; trophy icon; h3 `You unlocked the white test`; p `Congratulations on finishing every video in {name}. The white test is a final check of your knowledge before the official certification exam.`; form button `.wt-btn.wt-btn--primary` `Start the test` + `→`; meta cards `Time limit` `10 minutes`, `Questions` `5`, `Passing score` `70%` (fa-clock-o, fa-question-circle, fa-percent).
2. Data: enrolment progress; cert (id, code, name, provider).
3. POST (any body; result page sends `retake=1`, ignored): (re)initialise `$_SESSION['white_test']` (see §3) and redirect `white-test-take.php`. Always a fresh test (overwrites any previous).
4. `?cert={id}`.
5. Inline `style=""` attributes on lines 70–77 (center text, 48px gold `#c9a44a` icon, margins, max-width 540px). No script.
6. auth; cert<=0 -> certifications.php; not enrolled OR progress<100 -> `course.php?cert={id}`; cert missing -> certifications.php.
   Note: the question bank exists only for `PCAP`; for any other cert code the take page gets 0 questions (would break — `$questions[0]` undefined).

### white-test-take.php
1. Markup 66–107; script 109–151. Nav: **nav-portal**. Title `White Test — In progress`.
   `.wt-header`: `.wt-counter` `Question {current+1} / {total}`, `.wt-timer#wtTimer` `MM:SS`. Error notice (inline style margin-bottom 12px). Form `#wtForm`: `.wt-card` > `.wt-question` text; `.wt-choices` > `label.wt-choice(.is-selected)` > radio `answer` value letter + `<span><strong>{L})</strong> {text}</span>`. Submit row: last question -> `.wt-btn.wt-btn--commit` `Submit answers`; else `.wt-btn--primary` `Next` + `→`. No Back button; previously saved answer pre-checked.
2. Data: none from DB (session + question bank).
3. Flow on every request (order):
   1. no session test -> certifications.php.
   2. submitted -> white-test-result.php.
   3. remaining = 600 − (now − started_at); <=0 -> set submitted, -> result (before POST handling, so timeout POST with no answer still finishes).
   4. POST: `answer` must be one of `A|B|C|D` else re-render with `Please select an answer to continue.` (no redirect). Valid -> store at answers[current_q]; if last -> submitted=true -> result; else current_q++ -> redirect take (PRG).
4. None.
5. Script: radio change toggles `.is-selected`; countdown from server `remaining`, ticks every 1 s rendering `MM:SS`; at 0 auto-submits form once.
6. auth + session state. No enrolment re-check.

### white-test-result.php
1. Markup 38–108. Nav: **nav-portal**. Title `White Test — Result`.
   h6 `{provider} &middot; {code}`, h2 `White Test &mdash; Result`. `.wt-result-header`: `.wt-score` `{correct} / {total}`, `.wt-pct` `{pct} %`, badge `.wt-badge.is-pass` `✓ Passed` or `.is-fail` `✗ Not passed`, `.wt-result-meta` `Passing score: 70 %`.
   Review per question `.wt-review-item.is-correct|is-wrong`: `.wt-review-q` `{n}. {question}`; line `Your answer` + `.wt-pick.is-correct|is-wrong|is-missing` `{L}) {text}` or `— no answer —`; if wrong also `Correct answer` + `{L}) {text}`.
   Actions: passed -> `Final exam` + `→` (final-exams.php, primary) and `Back to dashboard` (ghost). Failed -> form POST `white-test.php?cert={id}` hidden `retake=1` button `.wt-btn--soft` `Retake exam`, and `Back to dashboard`.
2. Data: cert (name, provider, code) by session cert_id; score via `white_test_score`. Nothing persisted.
3. None besides retake form.
4. None.
5. None.
6. auth; no test or not submitted -> `white-test.php?cert={cert_id}` if a cert_id is in session, else certifications.php; cert missing -> certifications.php. Result stays viewable until a new test is started.

### final-exams.php
1. Markup 69–175. Nav: **nav-portal** (active `final-exams` matches nothing). Title `Final Exam Vouchers — TEK-UP`.
   h6 `Certified Students Portal`, h2 `Final Exam <em>Vouchers</em>`, p `Your course material is complete. Request a voucher to schedule the official certification exam at a TEK-UP testing centre &mdash; one business day turnaround.`
2. Data:
   - eligible = user certs with progress >= 100 joined certs (id, code, name, provider, description, progress), ordered enrolled_at DESC.
   - map cert_id -> voucher status for user.
   Empty: icon fa-graduation-cap, h3 `No courses ready yet`, p `Finish every video in a certification track, pass the white test, and the cert will appear here so you can request your exam voucher.`, button `View my certifications` + `→` -> certifications.php.
   Row `li.fe-row`: seal icon (none: fa-check-circle, pending: fa-hourglass-half, approved: fa-trophy, rejected: fa-times-circle); `.fe-row__provider` `{provider} &middot; {code}`; title; desc; tags: always `Course complete` (`.fe-tag--ready`), plus pending `Voucher requested` / approved `Voucher approved` / rejected `Voucher rejected`. Action: approved -> disabled `Voucher issued` + note `Check your inbox for the exam slot.`; pending -> disabled `Voucher requested` + `We'll be in touch soon.`; rejected -> form `Request again` + `→` + note `Previous request was declined.`; none -> form `Request voucher` + `→`. WOW delay 0.15 +0.08.
3. POST `request_voucher_cert_id`: if >0 and user has that cert with progress>=100 -> insert voucher_requests(pending) **idempotently (ON DUPLICATE KEY UPDATE status=status)**. Always redirect `final-exams.php?flash=requested` (even if nothing inserted). **Bug**: for a rejected row "Request again" leaves status `rejected` (duplicate key keeps old status) — it's a no-op that still shows the success flash.
4. `?flash=requested` -> `.fe-flash` with fa-paper-plane: `Voucher request submitted — our certifications office will email you within one business day.`
5. None.
6. auth only (no white-test-passed check).

### profile.php
1. Markup 127–264; inline script 171–180. Nav: **nav-portal**, active `profile`. Title `Profile — TEK-UP Certified Students`.
   h6 `Account Settings`, h2 `Your <em>profile</em> &amp; <span>credentials</span>`, p `Your name, email and student ID come from your university record and cannot be edited here. You can update your phone and address.`
   Left `aside.profile-summary`: avatar img `uploads/avatars/{photo}` alt `Profile photo` or fa-user icon; `.profile-avatar-badge` camera; photo form (hidden file input `photo`, accept `image/jpeg,image/png,image/webp`, label `.profile-photo-button` pencil + `Change`); h3 full name (`Student` if blank); `.role` `TEK-UP &middot; {TU-00001}`; `.status-badge` `Active student`; stats `Certifications earned` **hard-coded `0`**, `Member since` `{year of users.created_at}` (current year if null); link `Change password &rarr;` (href `#`).
   Right form `#profile`: heading h3 `Personal information`, p `Update the details that appear on your student record.`; disabled inputs `First name`, `Last name`, `Email`, `Student ID`; editable `Phone` (type tel, placeholder `+216 70 250 000`), `Address` (placeholder `Street, city, country`); buttons `Save changes` (`.main-button`) and `Cancel` link -> dashboard.php.
2. Data: user (id, email, firstname, lastname, created_at) fresh from DB; profile (phone, address, photo).
3. POST (no PRG, notices inline):
   - Photo branch (when `$_FILES['photo']` present): upload error ini/form size -> `The file is too large.`; other upload error -> `Upload failed. Please try again.`; size > 5 MB -> `The file is too large (max 5 MB).`; MIME (sniffed) not jpeg/png/webp -> `Unsupported format. Use JPG, PNG or WEBP.`; move fails -> `Could not save the file. Please try again.`; DB fail -> `Could not save your photo. Please try again.`; success -> `Photo updated.` File saved as `user_{id}_{unixtime}.{ext}` in `uploads/avatars/`; upsert profiles.photo; previous file deleted.
   - Otherwise: upsert profiles phone/address (trimmed; empty -> NULL). Success `Profile saved.`; DB fail `Could not save your profile. Please try again.` No validation on phone/address.
4. None.
5. Script 171–180: on file input change, auto-submit photo form.
6. auth; user row missing -> session_destroy -> login.php (affects admin).

### admin-dashboard.php
1. Markup 24–98. Nav: **nav-admin**, active `admin-dashboard`. Title `Admin Dashboard — TEK-UP`.
   h6 `TEK-UP Admin Console`, h2 `Good day, <em>Administrator</em>`, p `Manage voucher requests, monitor portal usage, post announcements and respond to student messages from one place.`
2. Data: pending vouchers count; total users; total user_certifications; unread messages count.
   Cards (whole card is `a.dash-card-link`):
   - Vouchers (fa-ticket) -> admin-vouchers.php: `<strong>{n}</strong> pending request{s} awaiting approval.` or `Inbox empty &mdash; no voucher requests pending.`; `Review &rarr;`.
   - Statistics (fa-line-chart) -> admin-stats.php: `<strong>{users}</strong> student{s} &middot; <strong>{enrol}</strong> active enrolment{s}.` (counts ALL enrolments, not only in-progress); `View report &rarr;`.
   - News (fa-newspaper-o) -> admin-news.php: `Publish announcements that appear on the public homepage and student portal.`; `Open editor &rarr;`.
   - Messages (fa-envelope-o) -> admin-messages.php: `<strong>{n}</strong> new message{s} in the inbox.` or `Inbox empty &mdash; no new contact-form messages.`; `Open inbox &rarr;`.
   Plural `s` omitted only when count === 1.
3–5. None.
6. auth-admin.

### admin-vouchers.php
1. Markup 126–257; approve modal 259–298; script 300–326. Nav: **nav-admin**, active `admin-vouchers`. Title `Voucher Requests — Admin`.
   h6 `TEK-UP Admin Console`, h2 `Voucher <em>Requests</em>`, p `Review and action exam-voucher requests submitted by students. Approving a request notifies the student that their voucher is ready.`
2. Data:
   - Requests joined users + certs: id, status, requested_at, user email/firstname/lastname, cert code/name/provider; optional filter by status; ordered requested_at DESC.
   - Counts per status + all (unfiltered) shown in chips `All` `Pending` `Approved` `Rejected` with `.admin-chip-count`.
   - Row: seal (pending fa-hourglass-half, approved fa-trophy, rejected fa-times-circle); `{provider} &middot; {code}`; title cert name; desc `Requested by <strong>{name}</strong> &lt;{email}&gt; &middot; {d M Y, H:i}` (name falls back to email); tag `Pending`/`Approved`/`Rejected`. Actions: pending -> `Approve` + `→` (opens modal) and form `Decline` (ghost, action reject); non-pending -> form `Reset to pending` (soft, action reset).
   - Empty: fa-inbox, h3 `Inbox empty`, p `No voucher requests match this filter. Approved and rejected requests stay here for the audit trail.`
3. POST `voucher_id`, `action` ∈ approve|reject|reset (else no-op):
   - approve requires `admin_password` === `admin` else redirect `?flash=bad_password` (no change).
   - update status approve→approved, reject→rejected, reset→pending.
   - On approve: build mailto and store one-shot `$_SESSION['voucher_mailto']={href,email}`:
     - to = student email; subject `Your TEK-UP Voucher — {cert_name}`; expiration = today+10 days formatted `d M Y`; name = `First Last` or email; body exactly:
       ```
       Dear {student_name},

       Congratulations on successfully passing the certification requirements.

       Please find below your voucher information for the certificate:

       ---

       Voucher Code: [INSERT VOUCHER CODE]
       Certificate: {cert_name}
       Expiration Date: {expiration}
       ----------------------------------

       You can use this voucher to complete your certification process according to the provided instructions.

       If you have any questions or need assistance, feel free to contact us.

       Best regards,
       TEKUP Certified Student Office
       ```
       href = `mailto:` + rawurlencode(email) + `?subject=` + rawurlencode(subject) + `&body=` + rawurlencode(body).
   - Always redirect `admin-vouchers.php?flash={action}` (PRG; current filter is lost).
   - Modal: icon fa-key, h4 `Confirm voucher approval`, p `You are about to approve the voucher for <strong>{student}</strong> on <strong>{cert}</strong> ({code}). Re-enter your admin password to confirm.`, label `Admin password`, placeholder `••••••••`, buttons `Confirm approval` + `→` / `Cancel`.
4. `?filter=` all|pending|approved|rejected (default all). `?flash=`: `approve` -> `Voucher approved.`; `reject` -> `Voucher request declined.`; `reset` -> `Status reset to pending.`; `bad_password` -> `Incorrect admin password — the voucher was not approved.` (`.fe-flash.is-error`, fa-exclamation-triangle; others fa-check-circle). If a mailto is pending: `.fe-flash.has-action` adds `<span class="fe-flash__sub">Open the voucher email for <strong>{email}</strong> in your mail client.</span>` and button `a.wt-btn.wt-btn--primary.fe-flash__action` `Compose voucher email` + `→` (href mailto). Mailto is consumed on first render.
5. Script: modal `show.bs.modal` fills voucher id, student name, cert name (default `—`), code `({code})`, clears password; `shown` focuses password.
6. auth-admin.

### admin-messages.php
1. Markup 66–157. Nav: **nav-admin**, active `admin-messages`. Title `Messages — Admin`.
   h6 `TEK-UP Admin Console`, h2 `Inbound <em>Messages</em>`, p `Read and respond to enquiries submitted through the public contact form and the student portal.`
2. Data: messages (id, name, surname, email, message, status, submitted_at), optional status filter, ordered submitted_at DESC; counts per status + all. Chips `All` `Unread` `Read` with counts.
   Row `li.fe-row.msg-row(.is-unread)`: seal fa-envelope (unread) / fa-envelope-open-o; `{email} &middot; {d M Y, H:i}`; title `{name surname}`; `.msg-preview` = first 140 chars + `…` if longer; tag unread `.fe-tag--pending` `Unread` (fa-circle) / read `.fe-tag--ready` `Read`. Actions: `View` + `→` -> `admin-message.php?id={id}`; Delete form (`.wt-btn--ghost.wt-btn--danger` `Delete`) with `confirm('Delete this message from {full_name}? This cannot be undone.')`.
   Empty: fa-inbox, h3 `Inbox empty`, p `No messages match this filter. New submissions through the public contact form will appear here.`
3. POST `message_id`, `action`: `delete` -> delete row -> `?flash=deleted`; `mark_unread` -> status unread -> `?flash=marked_unread`; otherwise redirect plain `admin-messages.php`.
4. `?filter=` all|unread|read. `?flash=deleted` -> `Message deleted.`; `marked_unread` -> `Marked as unread.` (`.fe-flash` fa-check-circle).
5. Only inline `onsubmit` confirm.
6. auth-admin.

### admin-message.php
1. Markup 44–102. Nav: **nav-admin**, active `admin-messages`. Title `Message from {full_name} — Admin`.
   back-link `Back to messages`; h6 `TEK-UP Admin Console &middot; Message`; h2 `From <em>{full_name}</em>`. `.msg-detail`: `__avatar` = uppercase first letter of name + first letter of surname; `__name`; `__email` mailto link; `__time` fa-clock-o `Received {d M Y at H:i}`; tag always `Read`; `__body` message with newlines -> `<br>`; actions: `Reply by email` + `→` (href `mailto:{email}?subject=Re%3A%20your%20message%20to%20TEK-UP`), form -> admin-messages.php `mark_unread` button `Mark as unread` (soft), Delete form (posts to self) with same confirm text.
2. Data: message by id; **side effect on GET**: if unread, set status `read`.
3. POST `action=delete` (to `admin-message.php?id=`) -> delete -> `admin-messages.php?flash=deleted`.
4. `?id=` required (int >0) else -> admin-messages.php; not found -> admin-messages.php.
5. Inline confirm only.
6. auth-admin.

### admin-news.php
1. Markup 91–184; script 186–230. Nav: **nav-admin**, active `admin-news`. Title `News — Admin`.
   h6 `TEK-UP Admin Console`, h2 `<em>News</em> &amp; Achievements`, p `Upload photos to the homepage carousel. Images appear on the public landing page in upload order — newest first. Supported formats: JPG, PNG, WEBP, GIF (max 5 MB).`
   Upload card `.news-admin-upload`: hidden input `image` (accept jpeg/png/webp/gif, required); label dropzone `#news-dropzone` with fa-cloud-upload, `Click to choose an image`, hint `or drag &amp; drop &middot; JPG / PNG / WEBP / GIF &middot; up to 5 MB`, `#news-filename`; submit `Publish image` + `&rarr;` (disabled until file chosen).
   Gallery head: h3 `Published images <span>{count}</span>`, p `Click <strong>Remove</strong> to delete an image from the public carousel. Deletion is permanent.` Empty: fa-image + `No news images yet. Upload the first one above.` Grid `.news-admin-card`: thumb, date (see bug in §0), size `{round(KB)}&nbsp;KB`, Remove form (`.wt-btn--soft`, fa-trash-o `Remove`) with `confirm('Remove this image from the homepage? This cannot be undone.')`.
2. Data: filesystem listing of `assets/images/news` (name, size, mtime) sorted mtime DESC — same source as index.php carousel. No DB.
3. POST (no PRG, notices inline):
   - `action=delete`, `name`: basename; empty or contains `..` -> `Invalid filename.`; not an existing file inside dir -> `File not found.`; unlink fails -> `Could not delete the file.`; success -> `Image removed.`
   - `action=upload`, file `image`: ini/form size -> `The file is too large.`; other error -> `Upload failed. Please try again.`; >5 MB -> `The file is too large (max 5 MB).`; MIME not jpeg/png/webp/gif -> `Unsupported format. Use JPG, PNG, WEBP or GIF.`; move fails -> `Could not save the file. Please try again.`; success -> `Image uploaded — it's now live on the homepage.` Saved as `news_{unixtime}_{8 hex}.{ext}`.
4. None.
5. Script: file change -> show `{name}  ·  {KB} KB` (toLocaleString), enable submit, add `.is-ready`; dragenter/dragover add `.is-dragover`, dragleave/drop remove; drop assigns `input.files` and updates.
6. auth-admin.

### admin-stats.php
1. Markup 31–105. Nav: **nav-admin**, active `admin-stats`. Title `Statistics — Admin`.
   h6 `TEK-UP Admin Console`, h2 `Portal <em>Statistics</em>`, p `A snapshot of the certified-students portal: enrolment activity, course completion and voucher pipeline.`
2. Data / tiles (`.admin-stat` label/value/note):
   - `Registered students` = count users.
   - `Certifications in catalog` = count certifications.
   - `Enrolments (total)` = count user_certifications; note `{in_progress} in progress &middot; {earned} earned`.
   - `Courses ready for exam` = count user_certifications progress>=100; note `student-cert pairs at 100&nbsp;%`.
   - `Voucher requests` = count voucher_requests; note `{pending} pending`.
   - Panel h3 `Top 5 certifications by enrolment`: all certs LEFT JOIN enrolments, count per cert, ORDER BY count DESC, code ASC, LIMIT 5 (name, code, provider, n). Bar width = round(100·n / max(1, top n)). Row: `{provider} &middot; {code}`, count, title, bar. Empty text `No enrolments yet.` (practically unreachable: zero-enrolment certs still listed).
3–4. None.
5. Inline style attrs: `margin-top: 28px` row (line 80), bar widths.
6. auth-admin.

---

## 3. includes/white-test-questions.php

### Question bank (verbatim)
```json
{
  "PCAP": [
    { "question": "What is the correct way to print \"Hello\" in Python?",
      "choices": { "A": "echo(\"Hello\")", "B": "print(\"Hello\")", "C": "printf(\"Hello\")", "D": "show(\"Hello\")" },
      "answer": "B" },
    { "question": "Which symbol is used for comments in Python?",
      "choices": { "A": "//", "B": "<!-- -->", "C": "#", "D": "**" },
      "answer": "C" },
    { "question": "What is the result of 2 + 3 in Python?",
      "choices": { "A": "5", "B": "23", "C": "6", "D": "Error" },
      "answer": "A" },
    { "question": "Which data type is used for text in Python?",
      "choices": { "A": "int", "B": "float", "C": "str", "D": "bool" },
      "answer": "C" },
    { "question": "Which keyword is used to create a function in Python?",
      "choices": { "A": "func", "B": "define", "C": "function", "D": "def" },
      "answer": "D" }
  ]
}
```
`white_test_questions(code)` returns the bank for the code or `[]`.

### white_test_score(code, answers)
- For each question i: user_answer = answers[i] ?? null; is_correct = user_answer === answer (strict).
- Returns `{ correct, total, pct: total>0 ? int(round(100*correct/total)) : 0, passed: pct >= 70, per_question: [{question, choices, user_answer, correct_answer, is_correct}] }`.
- With 5 questions: 4/5 = 80 pass, 3/5 = 60 fail -> need ≥4 correct.

### Session state `$_SESSION['white_test']`
```
{ cert_id:int, cert_code:string, started_at:int(unix s), current_q:int (0-based),
  answers:[null,null,null,null,null]  // hard-coded length 5, values 'A'..'D'|null
  submitted:bool }
```
Created/reset by POST to white-test.php; mutated by white-test-take.php; read by white-test-result.php; never cleared (logout clears whole session). Time limit 600 s computed server-side from started_at.

---

## 4. templatemo JS actually relied on

`assets/js/templatemo-custom.js` (jQuery IIFE):
- **Sticky header**: on window scroll, if `scrollTop >= $('.header-text').height() - $('header').height()` add `background-header` to `<header>`, else remove it. Only index.php has `.header-text`; on other pages `height()` is undefined -> comparison false -> the handler **removes** `background-header` on first scroll (header CSS: `.header-area` has its own `#fafafa` bg, so effect is style change of logo/links). Port: just keep header solid on non-home pages, toggle on home.
- `.owl-our-team` owlCarousel init (items 3, loop, dots, autoplay, responsive 0:1, 600:2, 1000:3, 1600:3) — **no element uses this class; dead**.
- **Menu toggle**: `.menu-trigger` click -> toggle `.active` on trigger and `slideToggle(200)` `.header-area .nav`.
- **Smooth scroll**: `.scroll-to-section a[href*=#]` on same page -> animate scroll to target top+1 over 700 ms, closes mobile menu (<991px). Second handler for `href^="#"` (500 ms, swing, sets active) — nav-public hrefs are `index.php#...`, so only the first handler applies on index.php.
- **Scroll-spy** `onScroll`: for `.nav a` with in-page `#id` href sets `active` — nav-public uses `index.php#x` hrefs so it never matches (no-op).
- **Preloader**: on window `load` add `loaded` to `#js-preloader`.
- `mobileNav()` for `.submenu` — defined but never called.

`assets/js/animation.js`: WOW.js; initialised with `new WOW({animateClass:'animated', offset:50}).init()`. Elements with `.wow` + an animate.css name (`fadeIn`, `fadeInLeft/Right/Up/Down`, `bounceIn`, `bounceInUp`, `slideInDown`) and `data-wow-duration`/`data-wow-delay` animate when scrolled into view (hidden until then).

Bootstrap JS used: Modal (catalog, certifications x2, admin-vouchers) via `data-bs-toggle="modal"`/`data-bs-dismiss`, events `show.bs.modal` (uses `event.relatedTarget`), `shown.bs.modal`, `hidden.bs.modal`; Carousel (index). `owl-carousel.js`, `imagesloaded.js`, `owl.css` loaded but unused.

---

## 5. CSS location

- **No `<style>` blocks anywhere.** Page-specific styling lives entirely in `assets/css/templatemo-space-dynamic.css` (4959 lines; custom additions appended after the original theme). Confirmed present there: `.wt-btn` (+`--primary`, `--commit`, `--soft`, `--ghost`, `--danger`, `-arrow`), `.wt-*` quiz/result classes, `.cert-card`, `.cert-*`, `.certs-*`, `.stat-card`, `.filter-chip`, `.catalog-*`, `.cat-*`, `.enroll-*` (modal, btn `.is-locked`), `.msg-*` / `.msg-detail__*`, `.login-*` (`.login-page`, `.login-card`, `.login-error`…), `.fe-*` (`.fe-flash.is-error/.has-action`, `.fe-row__*`, `.fe-tag--*`, `.fe-empty`), `.admin-*` (chips, stat, rank, panel, actions), `.news-admin-*`, `.news-carousel` / `.our-news` (carousel indicators/controls restyled), `.dash-*`, `.profile-*`, `.course-*`, `.white-test-row.is-locked`, `.test-meta*`, `.form-notice(.is-success/.is-error/.is-info)`, `.hero-social*`, `.pillars`, `.contact-page`, `.contact-signed-in`, `.approve-*`. Section comments at lines ~2064 (cancel btn), 2157 (profile), 2545 (stats strip), 2581 (filter chips), 3891 (white-test buttons), 4057 (final exams), 4364 (news gallery), 4510+ (admin console additions), 4698 (contact locked fields), 4858 (message detail).
- Only inline `style="..."` attributes: white-test.php 70–77 (layout/colours), white-test-take.php 75, admin-stats.php 80, and dynamic `width:%` on progress bars (certifications 147, course 103, admin-stats 95).
- CSS uses `:has()` (`.catalog-card:has(.enroll-btn.is-locked)`).
- Other CSS: `animated.css` (animate.css), `fontawesome.css` (Font Awesome 4.x, `fa fa-*` names), `owl.css`.

---

## 6. Asset inventory

`assets/images/news/` (8):
- 696126321_995625282812347_2742271832016498348_n.jpg
- 696282146_994934239548118_4800355187093740467_n.jpg
- 696881521_995729302801945_3557291500901662285_n.jpg
- 697062056_994948136213395_1839914564616004790_n.jpg
- 697777723_994993622875513_1659045749949871843_n.jpg
- 699010975_995634766144732_1431707900303520702_n.jpg
- 699650890_995721799469362_1160164391028259687_n.jpg
- 700124739_995522152822660_533561874467326606_n.jpg

`assets/images/partners/` (5; filenames contain spaces, referenced URL-encoded): `Chuck Robbins.jpg`, `Maureen Lonergan.jpg`, `Satya NADELLA.jpg`, `Satya NADELLA2.jpg` (unused), `Thomas Kurian.jpg`.

Other `assets/images/`: about-bg.png, about-left-image.png, baner-dec-left.png, baner-dec-right.png, banner-right-image.png, big-blog-thumb.jpg, blog-dec.png, blog-thumb-01.jpg, catalog.png, contact-bg.png, contact-decoration.png, logo1.png, logo2.jpg, portfolio-image.png, service-icon-01..04.png, services-left-image.png.

`assets/fonts/`: Flaticon.woff, flexslider-icon.{eot,svg,ttf,woff}, FontAwesome.otf, fontawesome-webfont.{eot,svg,ttf,woff,woff2}, slick.{eot,svg,ttf,woff}.

`vendor/` (2 levels):
```
vendor/
  bootstrap/
    css/  (bootstrap.min.css, bootstrap.min.css.map)   -- v5.0.0-beta2
    js/   (bootstrap.bundle.min.js, .map, bootstrap.min.js)
  jquery/
    jquery.js, jquery.min.js, jquery.min.map, jquery.slim.js, jquery.slim.min.js, jquery.slim.min.map  -- v3.3.1
```

`uploads/avatars/`: index.html, user_1_1778869855.jpg.
Other files not in scope: `import-course.php` (media import tool), `index.html` (original template), `prepros.config`, `database/tekup.sql`, `docs/superpowers/{plans,specs}` (course-content + white-test designs, 2026-05-14).
