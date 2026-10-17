# TEK-UP Certified Students — v2 frontend

React + Vite + TypeScript port of the v1 PHP pages (`../../Project`). It runs without a backend: all data comes from a mock API in `src/api/`, saved in the browser's localStorage.

## Run

    npm install
    npm run dev      # http://localhost:5173
    npm run build    # type-check + production build
    npm run lint

## Run with Docker

From `Project_v2/`:

    docker compose up --build -d             # production build behind Nginx: http://localhost:8088
    docker compose --profile dev up dev      # Vite dev server with hot reload: http://localhost:5173
    docker compose down

Ports can be changed with `WEB_PORT` / `DEV_PORT` (e.g. `WEB_PORT=9000 docker compose up -d`).
Course videos in `public/media/` are mounted into the Nginx container, not baked into the image.

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
