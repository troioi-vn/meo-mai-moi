# GEMINI.md — AI Agent Guide for Meo Mai Moi

This is the AI-agent-oriented guide: architecture, conventions, workflows, and safe/practical ways to contribute autonomously.

## 1. Project Summary

**Meo Mai Moi** is an open-source web application designed to help communities build pet rehoming networks. It connects pet owners with fosters and adopters, supporting a community-driven approach to pet welfare with support for multiple pet types (cats, dogs, and more).

## 2. Application Structure (User POV)

-   **Public Area:** Homepage, Available Pets, Pet Profiles, Available Helpers, Helper Profiles, Login/Registration.
-   **User Dashboard:** Account management, manage personal pet listings, manage helper profile, notifications.
-   **Admin Dashboard:** Manage all pets, pet types, users, applications, and transfers.

## 3. Tech Stack & Core Architecture

-   **Backend:** Laravel (PHP) REST API with a Filament Admin Panel.
-   **Frontend:** React (TypeScript) SPA with Vite, Tailwind CSS, and shadcn/ui.
-   **Database:** SQLite (local), PostgreSQL (production).
-   **Deployment:** Docker Compose with an optimized multi-stage build.

### Core Architectural Principles

- **API First:** OpenAPI annotations + contract testing keep docs and code in sync.
- **Self-Service & Moderation:** Users manage their content; admins handle exceptions.
- **Mobile First:** Responsive UI and performance-friendly patterns.

### Core Data Models

-   **User Roles (RBAC):** Spatie Laravel Permission is the single source of truth. Roles are assigned via Spatie (e.g., `admin`, `super_admin`, `owner`, `helper`, `viewer`). The legacy `users.role` column has been removed via migration and should not be used.
-   **Permissions:** A granular system (`view_pet`, `create_pet`, etc.) is managed by Spatie + Filament Shield. Policies prefer ownership checks and `$user->can(...)`.
-   **Pet Status:** The `Pet` model uses a status enum: `active`, `lost`, `deceased`, `deleted`.
-   **Pet Types:** The `PetType` model defines available pet types (Cat, Dog, etc.) with capability enforcement through `PetCapabilityService`.

### Pet Capability Matrix

The system enforces different feature availability based on pet type:

| Capability      | Cat | Dog | Notes |
|-----------------|-----|-----|-------|
| placement       | ✅  | ❌  | Placement requests (fostering/adoption) |
| fostering       | ✅  | ❌  | Foster assignment workflows |
| medical         | ✅  | ❌  | Medical records and tracking |
| ownership       | ✅  | ❌  | Transfer and adoption workflows |
| weight          | ✅  | ❌  | Weight tracking and history |
| comments        | ✅  | ❌  | Comments and notes system |
| status_update   | ✅  | ❌  | Status changes (lost, deceased, etc.) |
| photos          | ✅  | ✅  | Photo uploads and management |

**Error Handling:** When a capability is not available for a pet type, the API returns a 422 error with `error_code: "FEATURE_NOT_AVAILABLE_FOR_PET_TYPE"`.

### Authentication

React Context (`AuthProvider`) manages session auth; Axios interceptor handles cookies.

### File Uploads

Files live in `storage/app/public`, exposed via `public/storage` symlink (`php artisan storage:link`). `FileUploadService` handles ops + image optimization.

## 4. Atypical Project Aspects & Key Workflows

This project has several specific, non-standard workflows that are critical to understand.

-   **Tightly Coupled Frontend/Backend Build:**
  - `frontend` build also updates backend view assets (see `welcome.blade.php`).
  - Docker multi-stage builds frontend first, then copies assets into backend image.

-   **Strict API Contract Testing:**
  - CI enforces parity with OpenAPI. When changing endpoints: update `@OA` annotations, run `php artisan l5-swagger:generate`, commit updated docs.

-   **Runtime Container Setup:**
  - `backend/docker-entrypoint.sh` runs setup on start (notably `storage:link` as `www-data`). Check here first for upload issues.

-   **Database-Driven Email Configuration:**
    -   Email provider settings can be managed via the **Email Configuration** section in the Filament admin panel (`/admin/email-configurations`).
    -   These settings are stored in the database. An **active** configuration in the admin panel will **always override** the `MAIL_*` settings in the `.env` file.
    -   For local development, using the `.env` file is fine, but ensure no configuration is marked as "active" in the admin panel if you want to use the `.env` settings.

## 5. Development Practices

### Versioning & Changelog

Semantic Versioning (e.g., `0.4.0`). Track changes in `CHANGELOG.md` under `[Unreleased]` → `Added/Changed/Fixed` with short user-facing lines.

### Testing Strategy

- Backend (Pest): unit + feature tests; prefer realistic request/response cycles.
- Frontend (Vitest + RTL): shared `renderWithRouter`, centralized mock data.

#### Frontend API Mocking (MSW)

For API mocking, we use **Mock Service Worker (MSW)**. It intercepts network requests and returns mocked data.

**Key Principles:**
1. Global server in `frontend/src/setupTests.ts`.
2. Centralized handlers per resource (e.g., `frontend/src/mocks/data/pets.ts`).
3. Absolute URLs in handlers (e.g., `http://localhost:3000/api/pets`).
4. Mirror real API shape, including `{ "data": ... }` wrapper.

#### Mocking UI Libraries (`sonner`)

`sonner` (toasts) needs a mock in `frontend/src/setupTests.ts` to prevent failures (mock `Toaster` and `toast.*`). See file for the current stub.

### Debugging Strategy

When debugging:
1) Understand the symptom (message/status/behavior)
2) Isolate (backend logs, nginx/php.ini, browser devtools)
3) Hypothesize → targeted fix
4) Verify (rebuild/restart, `optimize:clear`, re-test)

### Common Debugging Scenarios & Solutions

- Backend tests: schema mismatches
  - Symptom: “no such column” in tests using `RefreshDatabase`.
  - Fix: remove conflicting migrations; add new columns to initial creates; ensure `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` in test env; `php artisan optimize:clear`.

- Local DB driver issues
  - Symptom: `could not find driver` for PostgreSQL.
  - Fix: install `pdo_pgsql` or switch local to SQLite (`DB_CONNECTION=sqlite`, create `database.sqlite`); `php artisan config:clear`; verify via tinker.

- 403 in backend tests (policies)
  - Causes: wrong role/auth, missing policy, bad data state, missing relationships, mass assignment.
  - Fix: inspect `response->json()`, verify factories/roles/states, eager-load needed relations, check `$fillable`, clear caches.

- OpenAPI generation fails
  - Fix: follow error path/line; fix subtle `@OA` syntax (commas/brackets/parentheses).

- Frontend tests: missing browser APIs (Radix/shadcn)
  - Symptom: `hasPointerCapture` / `scrollIntoView` errors; flaky dropdown interactions.
  - Fix: polyfills live in `frontend/src/setupTests.ts` (PointerEvent + methods, scrollIntoView). Keep them enabled.

### Coding Style

- PHP/Laravel: PSR-12 via PHP-CS-Fixer; TypeScript/React: Airbnb via Prettier/ESLint.

### Linting and Formatting

This project uses several tools to enforce code style and quality.

-   **Frontend (TypeScript/React):**
    -   **ESLint:** For identifying and reporting on patterns in JavaScript. Run with `npm run lint` in the `frontend` directory.
    -   **Prettier:** An opinionated code formatter. It's recommended to use a Prettier extension in your editor to format on save.
-   **Backend (PHP/Laravel):**
    -   **PHP-CS-Fixer:** A tool to automatically fix PHP coding standards issues. Run with `composer format` in the `backend` directory.
    -   **Laravel Pint:** A new, opinionated PHP code style fixer for Laravel projects. It's built on top of PHP-CS-Fixer and is included as a dev dependency.
        -   To check for style issues, run `./vendor/bin/pint --test` in the `backend` directory.
        -   To fix style issues, run `./vendor/bin/pint` in the `backend` directory.

### Key Frontend Patterns

- Toasts: `sonner` (`toast`), API client: `@/api/axios` (`api`).
- Functional components with hooks; permission-driven UI (e.g., `isOwner`).

## 6. Command Glossary

-   **Start Application (Docker):** `docker compose up -d --build`
-   **Run Backend Tests:** `docker compose exec backend php artisan test`
-   **Run Frontend Tests:** `cd frontend && npm run test`
-   **Run Migrations/Seeders (Docker):** `docker compose exec backend php artisan migrate --seed`
-   **Generate API Docs:** `docker compose exec backend php artisan l5-swagger:generate`
-   **Admin Panel:** `http://localhost:8000/admin` (Credentials: `test@example.com` / `password`)
    -   **Helper Profile Moderation:** Approve, reject, suspend, reactivate helper profiles with bulk actions
    -   **Photo Management:** Upload, edit, and manage helper profile photos via relationship manager

## 7. User Preferences

Development commands: prefer `php artisan ...` locally in `backend/` during dev.

## Agent Quickstart (Read Me First)

This section is for AI coding agents (Copilots) to be effective, safe, and fast in this repo.

### Quick Repo Map

- Backend (Laravel): `backend/` (API, models, policies, Filament admin)
- Frontend (React+TS): `frontend/` (Vite, shadcn/ui, MSW mocks, Vitest)
- Docs/ops: `docs/`, `docker-compose.yml`, `GEMINI.md`

### Frontend Rules of the Road

- Axios baseURL `/api`; use relative endpoints (`api.get('cats/1')`) to avoid `/api/api`.
- MSW tests use absolute URLs; mirror `{ data: ... }` shape.
- Prefer `findBy...` over nested `waitFor`.
- Radix/shadcn tests: Select trigger role is `combobox`; provide `DialogDescription`.
- Stable keys for list items.

### Backend Rules of the Road

- Keep OpenAPI annotations updated; regenerate docs with changes.
- Enforce policies/permissions; controllers assume policy checks.
- **Notification Triggers:** The `NotificationService` is the central component for sending notifications. Look for its usage in controllers that handle state changes, such as `TransferRequestController`, to understand what events trigger notifications.
- Do not read or write `users.role` column; use `$user->hasRole()` / `$user->assignRole()` and `$user->can()`.

### Common Pitfalls & Fixes

- Double `/api` in frontend: use relative endpoints with axios baseURL.
- Flaky waits: use `findBy...` and stable UI states.
- MSW shape mismatch: always include top-level `{ data: ... }`.
- JSDOM gaps: keep setupTests polyfills enabled.

### Typical Agent Workflow

1) Extract requirements into a short checklist; execute if safe.
2) Find files fast (semantic search); read larger blocks.
3) Make smallest viable change; preserve public APIs/styles.
4) If runtime behavior changes, add/adjust tests first/alongside.
5) Run targeted tests; iterate to green.
6) Add toasts and refresh hooks for UX/state sync.
7) Record notable patterns here.

### Patterns Added in This Session (summary)

- Placement responses flow: modal submit → owner confirm/reject with toasts and `refresh()`; `/requests` filters are client-side.
- Handover lifecycle UI: create pending handover on accept; schedule/modal; status chips; confirm/dispute/cancel/complete; UI hides fulfilled requests.
- Visibility rule: show "Active Placement Requests" only when open/active.
- My Cats sections: API returns sections; UI shows sections + "Show all" toggle; keep MSW handlers aligned.
- Hooks guard: never call hooks conditionally or inline in props; declare `useMemo` at top.

### Session Notes — 2025-08-11 (condensed)

- Vite/ESM type-only imports (`import type { ... }`) to avoid runtime export errors.
- shadcn/ui: re-export `buttonVariants` from `button.tsx` to avoid missing export issues.
- Vitest + jsdom: polyfill PointerEvent + pointer capture + `scrollIntoView`; mock `sonner` Toaster; prefer `globalThis` feature checks.
- ESLint/TS: `??`, await promises, cast before template strings, avoid nested component defs.
- Radix typing: avoid custom ref props unless needed; prefer simple pass-through or standard `forwardRef`.
- CatPhotoManager: preserve `viewer_permissions`; compute `canEdit` from owner/permissions; update state + `onPhotoUpdated` after uploads.
- Axios helper types: use `{ data: T }` generics; destructure `response.data.data`.

### Session Notes — 2025-08-13 (Rehoming/Handover Flow, condensed)

- Endpoints: GET latest handover, POST cancel/confirm/complete routes wired.
- UI: CatProfile shows chips + meeting details; helper confirm/dispute panel; meeting banner with Cancel/Complete; CatDetails hides fulfilled requests.
- Policy: `CatPolicy@view` allows accepted helper to view cat until completion.
- Tests: absolute URLs; `{ data: ... }`; prefer `findBy...`.
- Follow-ups: post-completion redirects; foster return UI parity.

### Session Notes — 2025-08-16 (Admin & DB Setup, condensed)

- Local DB: default to SQLite for dev; update `.env`; remove redundant migrations; docs added.
- Admin moderation: HelperProfile actions (approve/reject/suspend/reactivate), bulk actions, suspended status, photo relation manager; badges + confirmations + toasts.
- Workflow: noted migration conflict resolution; added DB troubleshooting; SQLite recommended for local.

### Speedrun Commands (optional)

```bash
# Frontend
cd frontend
npm test --silent

# Backend
cd ../backend
php artisan test
```

### Session Notes — 2025-09-25 (Placement Request Feature)

- **Backend:**
  - Added `placement_requests_allowed` boolean to `pet_types` table with a default of `false`.
  - Updated `PetType` model to include the new field.
  - Updated `PetTypeSeeder` to set `placement_requests_allowed` to `true` for cats.
  - Updated `PetCapabilityService` to use the new database field for the `placement` capability.
  - Created a `helper_profile_pet_type` pivot table to associate helper profiles with pet types.
  - Updated `HelperProfile` model with a `petTypes` relationship.
  - Updated `HelperProfileController` to handle the new relationship.
- **Admin Panel:**
  - Added a checkbox to the `PetTypeResource` to allow admins to toggle `placement_requests_allowed`.
- **Frontend:**
  - Updated the `HelperProfileEditPage` to include a list of checkboxes for pet types that allow placement requests.
  - Updated the `/requests` page to include a filter for pet types.
- **Tests:**
  - Created a `PetTypeFactory`.
  - Updated `PetCapabilityServiceTest` and `PlacementRequestTest` to reflect the new database-driven `placement` capability.
  - All tests are passing.