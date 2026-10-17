# TEK-UP Certified Students — v2 frontend

React + Vite + TypeScript port of the v1 PHP pages (`../../Project`). Sign up, sign in and sign out use the Django backend (`../backend`); everything else still comes from a mock API in `src/api/`, saved in the browser's localStorage.

## Run

    npm install
    npm run dev      # http://localhost:5173 — /api is proxied to Django on :8000 (start it first)
    npm run build    # type-check + production build
    npm run lint

## Run with Docker

From `Project_v2/`:

    docker compose up --build -d             # production build behind Nginx: http://localhost:8088
    docker compose --profile dev up dev      # Vite dev server with hot reload: http://localhost:5173
    docker compose down

Ports can be changed with `WEB_PORT` / `DEV_PORT` (e.g. `WEB_PORT=9000 docker compose up -d`).
Course videos in `public/media/` are mounted into the Nginx container, not baked into the image.

## Demo accounts

Create them in Django once with `python manage.py seed_demo_users` (in `../backend`). The mock data (enrolments, progress, vouchers) is attached to these emails.

| Role | Email | Password |
|---|---|---|
| Student (PCAP at 33 %) | user1@tek-up.de | 123456789 |
| Student (PCAP complete) | user2@tek-up.de | 123456789 |
| Admin | admin@tek-up.de | admin123 |

"Reset demo data" in the footer restores the seed.

## Mock API

- `src/api/*.ts` — one module per domain; every function is async and returns the shape the Django API will return. To connect Django, replace the bodies with `fetch('/api/...')`; pages don't change.
- `src/api/http.ts` — `fetch` wrapper for Django: sends the CSRF token, turns `{detail}` errors into `ApiError`.
- `src/api/auth.ts` — already real: calls `/api/auth/*`, then links the Django user to the mock user with the same email so the other mock pages keep working.
- `src/api/db.ts` — in-memory store persisted to localStorage (`tekup-v2-mock-db`).
- `src/api/fixtures.ts` — seed data from `Project/database/tekup.sql` plus demo course content.

## Course videos

Not bundled. See `public/media/README.txt`.

## Differences from v1

See "Known v1 bugs: decisions" in `../docs/superpowers/plans/2026-09-26-frontend-migration.md`.
