# GEMINI.md — AI Agent Guide for Meo Mai Moi

This document is the AI-agent-oriented project description and development guide. Use it to understand the architecture, conventions, workflows, and safe/practical ways to contribute autonomously.

## 1. Project Summary

**Meo Mai Moi** is an open-source web application designed to help communities build cat rehoming networks. It connects cat owners with fosters and adopters, supporting a community-driven approach to cat welfare.

## 2. Application Structure (User POV)

-   **Public Area:** Homepage, Available Cats, Cat Profiles, Available Helpers, Helper Profiles, Login/Registration.
-   **User Dashboard:** Account management, manage personal cat listings, manage helper profile, notifications.
-   **Admin Dashboard:** Manage all cats, users, applications, and transfers.

## 3. Tech Stack & Core Architecture

-   **Backend:** Laravel (PHP) REST API with a Filament Admin Panel.
-   **Frontend:** React (TypeScript) SPA with Vite, Tailwind CSS, and shadcn/ui.
-   **Database:** SQLite (local), PostgreSQL (production).
-   **Deployment:** Docker Compose with an optimized multi-stage build.

### Core Architectural Principles

-   **API First:** The API is documented using OpenAPI (Swagger) annotations. We use **API Contract Testing** to ensure the documentation and implementation never drift apart.
-   **Self-Service & Moderation:** The platform empowers users to manage their own content. Admins focus on handling exceptions and community-reported issues.
-   **Mobile First:** The frontend is built with a responsive, mobile-first design strategy.

### Core Data Models

-   **User Roles:** `ADMIN`, `CAT_OWNER`, `HELPER`, `VIEWER`.
-   **Permissions:** A granular system (`CREATE_CAT`, `VIEW_CONTACT_INFO`, etc.) is managed by Spatie Laravel Permission.
-   **Cat Status:** The `Cat` model uses a status enum: `active`, `lost`, `deceased`, `deleted`.

### Authentication

The frontend uses React Context (`AuthProvider`) to manage session-based authentication state. An Axios interceptor automatically handles session cookies for all API requests.

### File Uploads

Uploaded files are stored on the local filesystem in `storage/app/public` and made accessible via the `public/storage` symlink, which is created by the `php artisan storage:link` command. The `FileUploadService` handles all file operations, including image optimization.

## 4. Atypical Project Aspects & Key Workflows

This project has several specific, non-standard workflows that are critical to understand.

-   **Tightly Coupled Frontend/Backend Build:**
    -   The frontend and backend build processes are linked. Running `npm run build` in the `frontend` directory not only builds the assets but also directly modifies the backend's `welcome.blade.php` file.
    -   The Docker build is a multi-stage process that builds the frontend first, then copies the compiled assets into the final backend image. This is crucial for understanding deployment.

-   **Strict API Contract Testing:**
    -   Our CI/CD pipeline enforces that the API implementation never deviates from its OpenAPI documentation.
    -   If you change an API endpoint, you **must** update its `@OA` annotation, run `php artisan l5-swagger:generate`, and commit the updated `openapi.json` file. Builds will fail otherwise.

-   **Runtime Container Setup:**
    -   The `backend/docker-entrypoint.sh` script performs critical setup tasks every time the container starts, most importantly running `php artisan storage:link` as the `www-data` user. If file uploads are not working, this script is the first place to check.

## 5. Development Practices

### Versioning & Changelog

We use **Semantic Versioning** (e.g., `0.4.0`). All changes are tracked in `CHANGELOG.md`.

**Changelog Workflow:**
1.  **Finish your task** (e.g., fix a bug, add a feature).
2.  **Open `CHANGELOG.md`** and find the right category under `[Unreleased]` (`Added`, `Changed`, `Fixed`).
3.  **Add a short, clear line** describing the change from a user's perspective (e.g., "- Added a 'Stay Logged In' checkbox to the login page.").

### Git Workflow

-   **Branches:** All work is done on separate branches.
-   **Naming:** `feature/task-description` or `fix/bug-description`.

### Testing Strategy

-   **Backend (Pest):** We use a layered approach with **Unit tests** for isolated components and **Feature tests** for full API request-response cycles.
-   **Frontend (Vitest + RTL):** We test components in a realistic environment using a shared `renderWithRouter` utility and centralized mock data.

#### Frontend API Mocking (MSW)

For API mocking, we use **Mock Service Worker (MSW)**. It intercepts network requests and returns mocked data.

**Key Principles:**
1.  **Use the Global Server:** The global server is configured in `frontend/src/setupTests.ts`.
2.  **Use Centralized Handlers:** Mock handlers are organized by resource (e.g., `frontend/src/mocks/data/cats.ts`).
3.  **Use Absolute URLs:** Handlers must use absolute URLs (e.g., `http://localhost:3000/api/cats`).
4.  **Match API Structure:** Mock responses must match the real API structure, including the `{ "data": ... }` wrapper.

#### Mocking UI Libraries (`sonner`)

The `sonner` library, used for toast notifications, requires a specific mock configuration in `frontend/src/setupTests.ts` to prevent widespread test failures. If tests are failing with errors related to `Toaster` or `matches`, ensure the following mock is in place:

```typescript
// In frontend/src/setupTests.ts
vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Toaster: () => null, // Mock Toaster component
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});
```

### Debugging Strategy

When encountering an issue, follow this process:
1.  **Understand the Symptom:** Identify the error message, status code, and behavior.
2.  **Isolate the Problem:** Check logs (`docker compose logs -f backend`), inspect configurations (`nginx.conf`, `php.ini`), and use browser dev tools.
3.  **Formulate a Hypothesis:** Propose a likely cause.
4.  **Implement a Targeted Fix:** Make a small, isolated change.
5.  **Verify the Fix:** Rebuild and restart containers (`docker compose up -d --build --force-recreate`), clear caches (`php artisan optimize:clear`), and re-test.

### Common Debugging Scenarios & Solutions

This section documents common issues encountered during development and their effective solutions.

-   **Backend Test Environment - Database Schema Mismatches:**
    -   **Symptom:** Tests fail with "no such column" or similar schema-related errors, even when `RefreshDatabase` trait is used.
    -   **Cause:** Often due to conflicting migration files (e.g., a consolidated migration trying to recreate existing tables) or new columns not being present in the *initial* table creation migration. The `RefreshDatabase` trait might not always re-run *all* migrations if it perceives the schema as already migrated based on the `migrations` table.
    -   **Solution:**
        1.  **Identify and Remove Conflicting Migrations:** If a migration attempts to create tables that already exist (e.g., a consolidated `create_initial_tables` migration), remove it.
        2.  **Ensure New Columns are in Initial Migration:** For new columns, add them directly to the *initial* migration that creates the table, rather than a separate `add_column_to_table` migration. This ensures the column is always present when the table is first created in a fresh test environment.
        3.  **Verify `phpunit.xml`:** Ensure `DB_CONNECTION` is `sqlite` and `DB_DATABASE` is `:memory:` for a clean, in-memory database for each test run.
        4.  **Clear Caches:** Always run `php artisan optimize:clear` to ensure Laravel's configuration and route caches are fresh.

-   **`403 Forbidden` Errors in Backend Tests (Authorization Issues):**
    -   **Symptom:** API requests in feature tests return `403 Forbidden` even when the user appears to have the correct role/permissions.
    -   **Causes:**
        1.  **Incorrect User Role/Authentication:** The test user's role might not be correctly set, or the authentication method (`Sanctum::actingAs()`, `$this->be()`) might not be fully simulating the production environment.
        2.  **Missing/Incorrect Policy Definition:** The relevant policy might not be registered in `AuthServiceProvider.php`, or its authorization logic (`create`, `view`, `update`, `accept`, `reject` methods) might be flawed.
        3.  **Incorrect Data State:** The model's attributes (e.g., `cat->status`, `transferRequest->status`) might not be in the expected state for the authorization check to pass.
        4.  **Missing Relationships:** Required relationships (e.g., `placementRequest` on `TransferRequest`) might not be eager loaded in the test, causing `null` objects and subsequent authorization failures.
        5.  **Mass Assignment Issues:** Missing attributes in the model's `$fillable` array can prevent data from being saved, leading to unexpected states.
    -   **Solution:**
        1.  **Systematic Debugging with `dd()`:** Use `dd($response->json())` to inspect the full API response, including error messages. Use `dd($user->role)`, `dd($cat->status)`, `dd($transferRequest->status)`, and `dd($transferRequest->placementRequest)` at critical points in the controller and policy methods to inspect object states and pinpoint where the authorization check fails.
        2.  **Verify User Roles and Data in Test Factories:** Ensure test factories create users with the correct roles and models with the necessary attributes and relationships in the expected states (e.g., `CatStatus::ACTIVE`, `PlacementRequestStatus::OPEN`, `TransferRequestStatus::PENDING`).
        3.  **Eager Load Relationships:** If a policy or controller relies on a relationship, ensure it's eager loaded in the test (e.g., `->load('placementRequest')`) to prevent `null` object issues.
        4.  **Check `$fillable` Arrays:** Confirm all mass-assignable attributes are included in the model's `$fillable` array.
        5.  **Clear Caches:** Always run `php artisan optimize:clear` after making changes to policies or controllers.

-   **OpenAPI Documentation Generation Failures:**
    -   **Symptom:** `php artisan l5-swagger:generate` command fails with syntax errors (e.g., "unexpected '}', expecting EOF").
    -   **Cause:** Syntax errors within `@OA` annotations in PHP files. These are often subtle, like a missing comma, bracket, or parenthesis.
    -   **Solution:** The error message usually provides a file path and line number. Carefully inspect the annotations around that line for any syntax mistakes.

-   **Frontend Test Environment - Missing Browser APIs:**
    -   **Symptom:** Tests, especially for components using libraries like Radix UI, fail with obscure errors. This can manifest as timeouts in `waitFor`, or TypeErrors like `target.hasPointerCapture is not a function` or `candidate.scrollIntoView is not a function`. Another symptom is that interactions (like clicking a dropdown) don't work as expected, and elements that should appear are not found.
    -   **Cause:** The `jsdom` environment, used by Vitest for running tests, is a pure JavaScript implementation of web browser standards and does not include all browser APIs, particularly those related to rendering, layout, and complex user interactions.
    -   **Solution:** Add polyfills for the missing APIs to the test setup file (`frontend/src/setupTests.ts`). This ensures the components behave in the test environment as they would in a real browser.

        **Example Polyfills for `frontend/src/setupTests.ts`:**

        ```typescript
        // Polyfill for PointerEvents
        if (!global.PointerEvent) {
          class PointerEvent extends MouseEvent {
            public pointerId?: number;
            constructor(type: string, params: PointerEventInit) {
              super(type, params);
              this.pointerId = params.pointerId;
            }
          }
          global.PointerEvent = PointerEvent as any;
        }

        // Polyfills for PointerEvent methods on Element
        if (!Element.prototype.hasPointerCapture) {
          Element.prototype.hasPointerCapture = function (pointerId: number): boolean {
            // Return a mock value
            return false;
          };
        }
        if (!Element.prototype.setPointerCapture) {
          Element.prototype.setPointerCapture = function (pointerId: number): void {
            // No-op
          };
        }
        if (!Element.prototype.releasePointerCapture) {
          Element.prototype.releasePointerCapture = function (pointerId: number): void {
            // No-op
          };
        }

        // Polyfill for scrollIntoView
        if (!window.HTMLElement.prototype.scrollIntoView) {
          window.HTMLElement.prototype.scrollIntoView = function () {};
        }
        ```

### Coding Style

-   **PHP/Laravel:** PSR-12, enforced by `PHP-CS-Fixer`.
-   **TypeScript/React:** Airbnb style guide, enforced by Prettier and ESLint.

### Key Frontend Patterns

-   **Notification System:** `sonner` (`import { toast } from 'sonner'`).
-   **API Client:** `@/api/axios.ts` (`import { api } from '@/api/axios'`).
-   **Component Style:** Functional Components with Hooks.
-   **Permissions:** UI is controlled by permission props (e.g., `isOwner`).

## 6. Command Glossary

-   **Start Application (Docker):** `docker compose up -d --build`
-   **Run Backend Tests:** `docker compose exec backend php artisan test`
-   **Run Frontend Tests:** `cd frontend && npm run test`
-   **Run Migrations/Seeders (Docker):** `docker compose exec backend php artisan migrate --seed`
-   **Generate API Docs:** `docker compose exec backend php artisan l5-swagger:generate`
-   **Admin Panel:** `http://localhost:8000/admin` (Credentials: `test@example.com` / `password`)

## 7. User Preferences

**Development Command Execution:** For development, use `php artisan ...` locally in the `backend/` directory, not via Docker.

## Agent Quickstart (Read Me First)

This section is for AI coding agents (Copilots) to be effective, safe, and fast in this repo.

### Quick Repo Map

- Backend (Laravel): `backend/` (API, models, policies, Filament admin)
- Frontend (React+TS): `frontend/` (Vite, shadcn/ui, MSW mocks, Vitest)
- Docs/ops: `docs/`, `docker-compose.yml`, `GEMINI.md`

### Frontend Rules of the Road

- Axios baseURL is `/api`. Use relative paths like `api.get('cats/1')` (NOT `/api/cats/1`) to avoid `/api/api` issues.
- Tests use MSW with absolute URLs (e.g., `http://localhost:3000/api/cats`). Keep handlers consistent with API shapes (usually `{ data: ... }`).
- Prefer `await screen.findBy...` over nested `waitFor(async () => await screen.findBy...)` to avoid flakiness.
- shadcn/ui Select and Dialog are Radix-based. In tests:
  - Select trigger role is `combobox`. Use visible option text; avoid role name guesses.
  - Provide DialogDescription to avoid a11y warnings.
- When editing lists, ensure items have stable React keys.

### Backend Rules of the Road

- Keep OpenAPI annotations updated; generate docs after changes.
- Respect policies/permissions; most controllers assume policy checks.

### Common Pitfalls & Fixes

- Double `/api` in frontend: use relative endpoints when axios baseURL is set.
- Flaky waits: avoid nested waitFor; rely on `findBy...` and stable UI states.
- Missing top-level fields in MSW responses cause undefined errors — mirror real API structure.
- JSDOM missing APIs: see setupTests polyfills (PointerEvents, scrollIntoView).

### Typical Agent Workflow

1) Read the ask, extract requirements into a short checklist. Execute directly if safe.
2) Locate files quickly using semantic search; favor reading larger contiguous blocks.
3) Implement smallest viable change; keep public APIs and styles intact.
4) If changing runtime behavior, add/adjust unit tests first or alongside.
5) Run targeted tests before full suite for speed; iterate until green.
6) Add toasts and refresh hooks for user feedback and state sync.
7) Document non-obvious behavior or patterns here when you learn something new.

### Patterns Added in This Session

- Placement responses flow:
  - Cat card shows Respond when eligible -> PlacementResponseModal collects helper profile and relationship type, has a confirmation step, and submits to `POST transfer-requests`.
  - Cat profile page lists transfer responses per placement request. Owner can Confirm/Reject with success/error toasts; UI calls `refresh()` hook to re-fetch.
- Filters on /requests page: type and date range, purely client-side.
- Test stability principles applied across modal, profile, and edit pages.

- Handover lifecycle UI (post-accept):
  - On accept, an initial pending TransferHandover is created server-side. Frontend auto-opens a scheduling modal and shows a "Schedule handover" action per accepted transfer.
  - The schedule button hides once a handover exists. A status chip for each accepted response is backed by the fetched handover status; inline meeting details (scheduled_at, location) are shown.
  - Helper gets a confirm/dispute panel while status is pending. Both parties see a meeting banner (pending/confirmed) with Cancel and Mark-as-completed.
  - On completion, ownership or foster assignment is finalized server-side. UI refreshes and hides inactive/fulfilled placement requests.

- Placement Request visibility rule:
  - In `CatDetails`, render the "Active Placement Requests" block only when there are active/open requests (`is_active || status in {open,pending_review}`). This hides requests after acceptance/fulfillment.

- My Cats sections pattern:
  - Backend exposes GET `/api/my-cats/sections` returning `{ owned: Cat[], fostering_active: Cat[], fostering_past: Cat[], transferred_away: Cat[] }`.
  - Frontend `MyCatsPage` consumes this shape; UI shows sections and a "Show all (including deceased)" toggle for Owned.
  - Note: keep API responses aligned with MSW handlers in tests (absolute URLs; `{ data: ... }` wrapper if applicable).

- React Hooks ordering guard:
  - Never call hooks conditionally or inline within JSX props if the call site can be skipped/added between renders. Avoid patterns like `useMemo(...)` directly inside a prop when the containing element may be conditionally rendered.
  - Prefer deriving values inline without `useMemo` unless profiling shows a need. If using `useMemo`, declare it unconditionally at the top of the component.

### Session Notes — 2025-08-11

- Vite/ESM type imports
  - If a module is used only for TypeScript types (e.g., `HelperProfile`), import it with `import type { HelperProfile } from '@/types/helper-profile'` to avoid runtime “doesn’t provide an export named …” errors.
  - Audit API helpers for value vs type imports; types should never be imported as runtime values.

- shadcn/ui exports and consumers
  - Some components (e.g., `alert-dialog.tsx`) import `buttonVariants` from `@/components/ui/button`. Ensure `button.tsx` re-exports `buttonVariants`, or update import sites to source `button-variants` directly. Re-exporting avoids broad refactors and fixes missing export runtime errors.

- Test environment polyfills (Vitest + jsdom)
  - Pointer events: polyfill `PointerEvent` and add `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture` on `Element.prototype` when missing.
  - Scrolling: polyfill `HTMLElement.prototype.scrollIntoView`.
  - Prefer feature checks using `in` operator and assign safely with narrow casts to avoid `any` and unnecessary-assertion lint warnings. Use `globalThis` for global feature detection.
  - Mock libraries that render portals/toasters (e.g., `sonner`) with lightweight stubs in `setupTests.ts` to stabilize tests.

- ESLint/TS rules alignment (practical tips)
  - prefer-nullish-coalescing: Use `??` instead of `||` for defaulting values that may be `0`, `''`, or `false`.
  - no-floating-promises: Always await Promises, add `.catch`, or mark explicit fire-and-forget calls with `void` when appropriate.
  - restrict-template-expressions: Convert non-strings before interpolation (e.g., `String(id)` for numeric keys).
  - react-x/no-nested-component-definitions: Move inline component definitions to top-level to satisfy rules and improve performance.

- Radix/shadcn components typing
  - Avoid custom `ref` props in wrapper components if lint complains (`react-x/no-forward-ref`). Prefer the simplest pass-through signature or standard `forwardRef` only when truly needed.

- CatPhotoManager behavior (owner controls)
  - Preserve `viewer_permissions` when merging server responses after photo upload/delete to keep overlay controls visible.
  - Compute `canEdit` from `isOwner || viewer_permissions?.can_edit === true`. Don’t rely solely on incoming server payload, as some local-only flags may be omitted.
  - After successful upload, update local state and call `onPhotoUpdated` with a merged Cat to sync parent views.

- API helpers shape
  - Axios responses commonly use `{ data: ... }`. Prefer typed generics like `api.get<{ data: T }>(...)` and destructure `response.data.data` to keep types accurate and avoid `any`.

### Session Notes — 2025-08-13 (Rehoming/Handover Flow)

- Endpoints integrated
  - Added/used GET `/api/transfer-requests/{id}/handover` to fetch the latest handover for a transfer.
  - Added/used POST `/api/transfer-handovers/{id}/cancel` to allow owner/helper to cancel pending/confirmed/disputed.
  - Completed flow already present: POST `/api/transfer-handovers/{id}/confirm`, POST `/api/transfer-handovers/{id}/complete`.

- Frontend integration points
  - `CatProfilePage`: maintains a map of existing handovers per accepted transfer; derives chips and inline meeting details from fetched data.
  - Helper-facing confirm/dispute panel rendered only when status is `pending` for the helper's accepted transfer.
  - Meeting banner appears for `pending`/`confirmed` with Cancel + Complete; actions toast and call `refresh()`.
  - `CatDetails`: shows only active/open placement requests; fulfilled/inactive ones are hidden post-accept/complete.

- Policy fix
  - Updated `CatPolicy@view` to allow the accepted responder (helper) to view the cat profile post-acceptance, preventing a 403 until handover completes.

- Testing notes
  - MSW handlers must use absolute URLs and return `{ data: ... }` shapes.
  - Prefer `findBy...` queries for async UI; avoid nested `waitFor`.

- Follow-ups
  - Post-completion redirect UX (permanent: "You are now the owner"; foster: "Foster period started").
  - Foster return UI to surface backend endpoints and mirror handover patterns.

### Speedrun Commands (optional)

```bash
# Frontend
cd frontend
npm test --silent

# Backend
cd ../backend
php artisan test
```

### When in Doubt

- Don’t guess file paths or API shapes — search and read. If a task seems risky, propose a minimal, reversible change and add tests.

-   **Collaboration Style:** Iterative, feedback-driven.
-   **Command Style:** Imperative (e.g., "Refactor this function").
-   **User Language:** Intermediate English (native: Russian). Communication should be clear and direct.
-   **Development Command Execution:** For development, use `php artisan ...` locally in the `backend/` directory, not via Docker.