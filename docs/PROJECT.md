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
| Backend | Django 6 (+ Django REST Framework later) | Built-in auth, admin panel and ORM |
| Database | SQLite for now → PostgreSQL later | SQLite needs no setup while we start |
| Runtime | Docker + docker compose, Nginx | Same setup on every machine |

## Project structure

```
Project_v2/
├── frontend/            React app (see frontend/README.md)
│   └── src/api/         mock API (data saved in the browser) — will call Django later
├── backend/             Django project
│   ├── config/          settings, URLs, WSGI/ASGI
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

## How to run

**Frontend**

```
cd frontend
npm install
npm run dev          # http://localhost:5173
```

**Backend**

```
cd backend
py -3.13 -m venv .venv                 # first time only
.venv\Scripts\activate
pip install -r requirements.txt        # first time only
python manage.py runserver             # http://127.0.0.1:8000
```

## Next steps

- Create the `accounts` app: real sign up, sign in and sign out with Django auth (session cookies, roles "student" and "admin").
- Add Django REST Framework and connect the frontend's sign-in / sign-up pages to the API.
- Move the other features from the mock API to Django, one by one.
- Switch to PostgreSQL and add the backend to `docker-compose.yml`.
