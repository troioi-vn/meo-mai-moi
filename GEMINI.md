# GEMINI.md — AI Agent Guide

Concise, AI-facing guide for architecture, workflows, testing, and troubleshooting. For full developer instructions, see `docs/development.md`. For native Postgres setup, see `utils/dev-pgsql-docker/README.md`.

## 1) What this app is

Meo Mai Moi helps communities rehome pets. Users can list pets, manage helper profiles, and coordinate placements. Admins moderate and manage the system.

## 2) Tech and architecture

- Backend: Laravel (PHP) + Filament admin
- Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui
- Database: PostgreSQL only (all envs). SQLite is not supported.
- Build/Run: Docker Compose; frontend assets copied into backend image in multi-stage builds
- API First: OpenAPI annotations; contract tests enforce parity

Key models and auth
- RBAC via Spatie Permission (single source of truth). The legacy `users.role` column is removed.
- Policies prefer `$user->can(...)`; permissions like `view_pet`, `create_pet`, etc.
- Pet status enum: `active`, `lost`, `deceased`, `deleted`.
- Pet types (Cat, Dog, …) with capability gating via `PetCapabilityService`.
- React `AuthProvider` manages session auth; Axios interceptor handles cookies.
- File uploads live under `storage/app/public` (exposed via `public/storage`).
## 3) Development basics (quick)


Preferred: Docker
- Start: `docker compose up -d --build`
- First-time init: `docker compose exec backend php artisan migrate:fresh --seed && docker compose exec backend php artisan shield:generate --all && docker compose exec backend php artisan storage:link`
- App: http://localhost:8000, Admin: http://localhost:8000/admin, Vite (optional): http://localhost:5173

Native (fast loop) with Dockerized Postgres
- Requirements: PHP 8.4+, Composer, Node 18+, PostgreSQL client tools (`psql`).
- Start DB: `cd utils/dev-pgsql-docker && docker compose up -d`
- Backend: `cd backend && php artisan migrate:fresh --seed && php artisan shield:generate --all && php artisan storage:link && php artisan serve`
- Note: `php artisan serve` requires the dev Postgres container running.

## 4) Testing

Backend (Pest/PHPUnit)
- Run: `docker compose exec backend php artisan test` (or `cd backend && php artisan test` natively)
- With schema dumps: tests call `psql` for `RefreshDatabase`; install `postgresql-client` locally if missing.
- Seed dependencies in tests (e.g., `PetTypeSeeder`) to avoid FK and enum gaps.

Frontend (Vitest + RTL)
- Run: `cd frontend && npm test`
- MSW for API mocking: global server in `frontend/src/setupTests.ts`; handlers per resource under `frontend/src/mocks` using absolute URLs; mirror `{ data: ... }` API shape.
- `sonner` toasts are mocked in `frontend/src/setupTests.ts`.

## 5) Non-obvious workflows

- Frontend build feeds backend views (see `welcome.blade.php`). Docker build compiles frontend first, then copies assets into the backend image.
- Runtime setup happens in `backend/docker-entrypoint.sh` (e.g., `storage:link`). Check here for upload issues.
- Email settings are database-driven via Filament at `/admin/email-configurations`. An active DB config overrides `.env` `MAIL_*`.

## 6) Debugging playbook
General loop
1) Observe the exact error/behavior
2) Isolate (backend logs, browser devtools)
3) Fix one hypothesis
4) Verify: rebuild/restart, `php artisan optimize:clear`, retest

Common issues
- Backend tests: schema or FK errors with `RefreshDatabase`
  - Ensure dependent seeders run (e.g., `PetTypeSeeder`). Install `postgresql-client` if `psql` missing. Clear caches with `php artisan optimize:clear`.
- DB driver missing
  - Error: `could not find driver` → install `pdo_pgsql`, then `php artisan config:clear`.
- 403 in backend tests (policies)
  - Check roles/auth, factories/states, policies, mass assignment; inspect `response->json()`.
- OpenAPI generation errors
  - Fix minor `@OA` syntax (brackets/commas). Re-run `php artisan l5-swagger:generate`.
- Frontend test environment gaps (Radix/shadcn)
  - Polyfills and DOM stubs live in `frontend/src/setupTests.ts` (PointerEvent, `scrollIntoView`, etc.).

## 7) Linting & formatting

- Backend: Laravel Pint (`./vendor/bin/pint`).
- Frontend: ESLint + Prettier + TypeScript (`npm run lint`, `npm run typecheck`).

## 8) Quick commands

- Start (Docker): `docker compose up -d --build`
- Backend tests: `docker compose exec backend php artisan test`
- Frontend tests: `cd frontend && npm test`
- Migrate/seed (Docker): `docker compose exec backend php artisan migrate --seed`
- Generate API docs: `docker compose exec backend php artisan l5-swagger:generate`
- Admin panel: http://localhost:8000/admin

For complete workflows (Git, CI, more commands), see `docs/development.md`.