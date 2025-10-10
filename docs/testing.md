# Testing Guide

This repo uses a layered approach:

- Unit and integration tests: Vitest + React Testing Library + MSW (frontend), PHPUnit (backend)
- Architectural and static gates: ESLint/TS, dependency-cruiser, ts-prune, PHPStan, Deptrac, PHP Insights
- End-to-end (E2E): Playwright (opt-in, fast local runs, traces on failure)

## Frontend unit/integration

- Runner: Vitest (jsdom)
- Setup: `frontend/test/setupTests.ts`
  - Central MSW server import from `src/mocks/server`
  - Compact Testing Library errors
  - Polyfills (PointerEvent, ResizeObserver, matchMedia, scrollIntoView)
  - Mocks `sonner` Toaster to keep output quiet
- Shared helpers:
  - `frontend/test/utils/renderWithProviders.tsx` re-exports from `src/test-utils.tsx` for stable imports
- Commands:
  - From repo root: `npm run test:frontend`
  - From `frontend/`: `npm test`

Notes:
- Axios baseURL in unit tests uses `http://localhost:3000/api` so MSW handlers match absolute URLs and avoid hangs.
- tsconfig includes only `src` for app types; test files should import from `src/*` or `frontend/test/*` helpers referenced by Vitest via `vite.config.ts:test.setupFiles`.

## Playwright (E2E)

- Config: `frontend/playwright.config.ts`
  - baseURL defaults to `http://localhost:5173` (override with `PLAYWRIGHT_BASE_URL`)
  - When baseURL is localhost, Playwright auto-starts the dev server (`npm run dev`). For non-local baseURL (Docker/remote), it won't start a server and expects the target URL to be already running.
  - Reporters: list + HTML; traces on first retry; screenshots/video on failure
  - Project: Chromium (you can add WebKit later)
- Scripts:
  - Root: `npm run e2e`, `npm run e2e:ui`, `npm run e2e:report`
  - Frontend: `npm run e2e`, `npm run e2e:ui`, `npm run e2e:report`
- Dev server:
- Start the app in one terminal: `cd frontend && npm run dev`
  - Run E2E in another terminal: `npm run e2e`

### Run against different environments

Local dev (default):

```
# Auto-starts Vite dev server (because baseURL is localhost)
cd frontend
npm run e2e
```

Docker container or custom port/domain:

```
# Ensure the app is already running and reachable at the URL
export PLAYWRIGHT_BASE_URL=http://localhost:8080
cd frontend && npm run e2e
```

Shared dev/staging:

```
export PLAYWRIGHT_BASE_URL=https://dev.example.com
cd frontend && npm run e2e
```

Note: For non-local targets, the Playwright config will not start a web server; make sure the URL is live before running tests.

### Configure baseURL via .env

Playwright reads environment variables from local files in `frontend/` if present:

Priority order (topmost has highest priority):

1. Process environment (export PLAYWRIGHT_BASE_URL=...)
2. `.env.e2e.local`
3. `.env.e2e`
4. `.env.local`
5. `.env`

Quick setup:

```
cd frontend
cp .env.e2e.example .env.e2e.local
# edit .env.e2e.local, set PLAYWRIGHT_BASE_URL
npm run e2e
```

### Network stubbing pattern

We stub backend endpoints via `page.route` to keep E2E fast and deterministic without a real backend:

- CSRF: `**/sanctum/csrf-cookie` → 204
- Auth: `**/api/register`, `**/api/login`, `**/api/logout` → 200/201
- Current user: `**/api/users/me` → return a test user when authenticated
- Public settings: `**/api/settings/public` → control registration mode

See `frontend/e2e/auth.spec.ts` for a complete example (register → login → logout).

## Backend tests

- Run: `./vendor/bin/phpunit` or use provided VS Code tasks
- Quality gates: Composer audit, PHPStan, Deptrac, PHP Insights documented in `docs/development.md`

## CI pointers

- Add unit/integration gates first (eslint, tsc, vitest, phpstan, deptrac)
- Optionally add `npm run e2e` in CI with a dev server and xvfb (or use Playwright’s own `npx playwright install --with-deps`)
- Upload HTML reports (Vitest Coverage, Playwright report) as artifacts
# Testing Guide

Comprehensive testing instructions for backend and frontend.

## Backend Testing (Pest/PHPUnit)

**Always run backend tests inside the Docker container** to ensure proper extensions and PHP version.

```bash
# Run all tests
docker compose exec backend php artisan test

# Run specific test suites
docker compose exec backend php artisan test --testsuite=Feature
docker compose exec backend php artisan test --testsuite=Unit

# Run specific test files
docker compose exec backend php artisan test tests/Feature/PetControllerTest.php
docker compose exec backend php artisan test tests/Feature/WeightHistoryFeatureTest.php
```

## Frontend Testing (Vitest)

```bash
cd frontend

# Run all tests
npm test

# Interactive UI
npm run test:ui

# Coverage report
npm run test:coverage

# Run specific tests
npm test -- MicrochipsSection
npm test -- --reporter=verbose
```

**Coverage Reports**: Latest coverage reports are committed to `frontend/coverage/` and can be viewed by opening `frontend/coverage/index.html` in a browser.

## End-to-End (Playwright)

Playwright E2E tests live under `frontend/e2e/` and run against the dev server.

Quick start:

```bash
# In one terminal (dev server)
cd frontend
npm run dev

# In another terminal (from repo root)
npm run e2e            # headless run
npm run e2e:ui         # interactive UI
npm run e2e:report     # open last HTML report
```

Defaults:
- Base URL: `http://localhost:5173` (set `PLAYWRIGHT_BASE_URL` to override)
- Tracing: on first retry
- Video/Screenshots: retained on failure

Notes:
- The E2E suite stubs network calls where appropriate using Playwright `page.route(...)` to keep tests fast and deterministic (no backend required for core UI flows).
- If you prefer hitting a real backend, run the Laravel API locally and remove or adjust the route stubs in the spec files.

## Test Coverage

**Current Status:**
- **Frontend**: 238+ tests covering components, hooks, pages, and API integration
- **Backend**: Comprehensive feature and unit tests

**Coverage Reports:**
- **Frontend**: HTML coverage reports available at `frontend/coverage/index.html`
- **Backend**: Coverage reports generated to `backend/storage/coverage/`

**Key Areas Covered:**
- Pet management and health features
- User authentication and permissions
- Placement and transfer workflows
- Email notifications and admin panel
- React components with MSW API mocking

## Code Coverage (Backend)

Generate coverage reports using Xdebug:

```bash
# Build with Xdebug enabled
docker compose build --build-arg INSTALL_XDEBUG=true --build-arg INSTALL_DEV=true backend
docker compose up -d backend

# Generate coverage
docker compose exec backend bash scripts/run-coverage.sh
```

Coverage reports are saved to `backend/storage/coverage/`.

**Memory Issues**: If you see exit code 137 (OOM kill):
- Close other heavy processes
- Reduce parallelism: `export PARATEST=0`
- Run focused tests first

## Common Test Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `Component has errors: 'data.provider'` | Livewire form state mismatch | Set nested state: `->set('data.provider', 'smtp')` |
| Edit form values not persisting | Model not refreshed | Use `$record->refresh()` after save |
| No logs from overridden methods | Class not autoloaded | Run `php artisan optimize:clear` |
| `undefined_table: cache` error | Missing cache table migration | Run `php artisan cache:table && php artisan migrate` |

## Filament/Livewire Testing Tips

When testing Filament resources:

1. **Form Schema**: Ensure fields match the nested keys you're filling
2. **State Path**: If resource uses `->statePath('data')`, fill with `data.field_name`
3. **Select Components**: Use stored values, not display labels
4. **Debugging**: Use `->tap(fn($c) => ray($c->get('data')))` to inspect state

Example:
```php
livewire(EmailConfigurationResource::getPages()['create'])
    ->fillForm(['provider' => 'smtp', 'host' => 'localhost'])
    ->call('create');
```

## Cache Configuration

For database cache driver, create the cache table:

```bash
docker compose exec backend php artisan cache:table
docker compose exec backend php artisan migrate
```

Or use file cache in `.env.docker`:
```
CACHE_DRIVER=file
```