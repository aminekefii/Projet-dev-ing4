# TEK-UP Certified Students — v2

A simple overview of the project. We update this file after every step.

## The idea

TEK-UP Certified Students is a web portal where TEK-UP students prepare for IT certifications (Python Institute, Cisco, AWS, Microsoft, …).

- **Visitors** see the public site (home, news, contact form) and can create an account.
- **Students** sign in, browse the certification catalog, enrol in a course, watch the course videos, track their progress, practise with a "white test", and request an exam voucher when they are ready.
- **Admins** approve voucher requests, read contact messages, manage news images and see statistics.

v1 (`../Project`) was a PHP/MySQL demo. v2 rebuilds it with a modern stack: a React frontend and a Django backend, all running in Docker.

## Frameworks and tools

| Part | Technology | Why |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript, React Router | Fast dev server, typed code, one page per v1 screen |
| Backend | Django 6 + Django REST Framework | Built-in auth, admin panel and ORM; DRF for the JSON API |
| Database | SQLite for now → PostgreSQL later | SQLite needs no setup while we start |
| Runtime | Docker + docker compose, Nginx | Same setup on every machine |

## Project structure

```
Project_v2/
├── frontend/            React app (see frontend/README.md)
│   └── src/api/         API layer: auth calls Django, the rest is still a mock (data saved in the browser)
├── backend/             Django project
│   ├── config/          settings, URLs, WSGI/ASGI
│   ├── accounts/        users, sign up, sign in, sign out (API under /api/auth/)
│   ├── manage.py
│   └── requirements.txt
├── docs/                this file + design specs and plans
└── docker-compose.yml   runs the frontend (backend to be added)
```

## Steps done

1. **Frontend with React** (2026-09-26)
   All v1 pages ported to React: home, contact, sign in, student portal (dashboard, catalog, my certifications, course player, white test, final exams, profile) and admin pages (dashboard, vouchers, messages, news, statistics). Data comes from a mock API stored in the browser, so the app works without a backend.
2. **Docker for the frontend** (2026-10-17)
   `docker compose up --build -d` serves the production build with Nginx on http://localhost:8088. `docker compose --profile dev up dev` runs the dev server with hot reload.
3. **Sign in and sign up pages** (2026-10-17)
   New `/signup` page (first name, last name, email, password + confirmation) linked from the sign-in page. New accounts are students. For now it uses the mock API.
4. **Django backend created** (2026-10-17)
   Empty Django project in `backend/` (project package `config`). Nothing is connected to the frontend yet.
5. **Accounts app: sign up and sign in API** (2026-10-17)
   - Custom user model: people sign in with their **email** (no username), plus first name and last name. Passwords are hashed by Django.
   - Roles are Django groups `student` and `admin` (created by a migration). New sign-ups are students; superusers count as admins.
   - Sign-in uses Django session cookies, with CSRF protection on every POST.
   - Responses use the same user shape as the frontend: `id, email, firstname, lastname, role, createdAt`. Errors return `{"detail": "message"}`.
   - Automated tests: `python manage.py test accounts` (8 tests).
6. **Frontend sign in / sign up connected to Django** (2026-10-17)
   - The sign-in, sign-up and sign-out buttons now call the Django API. The Vite dev server forwards every `/api/...` request to Django on port 8000, so the browser sees one origin and the session cookie just works.
   - `frontend/src/api/http.ts` sends the CSRF token on every POST and turns Django's `{"detail": ...}` errors into the messages shown on the forms.
   - The other pages still use the mock data. After signing in, the Django user is linked to the mock user with the same email, so the demo data still shows up. New accounts start with no data.
   - Enrolment and voucher approval ask for the user's password again: the new `POST /api/auth/verify-password/` checks it in Django.
   - `python manage.py seed_demo_users` creates the demo accounts (user1, user2, admin @tek-up.de) in Django.

## Auth API

| Method | URL | What it does |
|---|---|---|
| GET | `/api/auth/csrf/` | Sets the `csrftoken` cookie. Call it once before any POST |
| POST | `/api/auth/register/` | Body `firstname, lastname, email, password`. Creates a student and signs in (201). Email taken → 409 |
| POST | `/api/auth/login/` | Body `email, password`. Signs in (200). Wrong details → 401 |
| POST | `/api/auth/logout/` | Signs out (204) |
| GET | `/api/auth/me/` | The signed-in user (200), or 403 when nobody is signed in |
| POST | `/api/auth/verify-password/` | Body `password`. 204 if it is the signed-in user's password, 400 if not |

Every POST must send the header `X-CSRFToken: <value of the csrftoken cookie>`.
Passwords follow Django's rules: at least 8 characters, not too common, not all numbers, not too close to the name or email.

## How to run

**Frontend**

```
cd frontend
npm install
npm run dev          # http://localhost:5173 (start the backend first: /api goes to Django)
```

**Backend**

```
cd backend
py -3.13 -m venv .venv                 # first time only
.venv\Scripts\activate
pip install -r requirements.txt        # first time only
python manage.py migrate               # create / update the database
python manage.py seed_demo_users       # first time: demo accounts from frontend/README.md
python manage.py createsuperuser       # optional: your own admin account
python manage.py runserver             # http://127.0.0.1:8000  (admin panel: /admin/)
python manage.py test                  # run the tests
```

## Next steps

- Move the other features from the mock API to Django, one by one.
- Switch to PostgreSQL and add the backend to `docker-compose.yml` (until then, the Docker production build at :8088 can't sign in: it has no backend behind `/api`).
