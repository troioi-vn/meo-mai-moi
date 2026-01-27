# Development Guide

This guide provides a comprehensive overview of how to get started with development, run tests, and follow our coding standards.

## Quick Start

**New to the repo?** Follow these steps to get running:

1.  **Run the app**

    ```bash
    ./utils/deploy.sh
    ```

    > **Note**: The backend automatically creates `.env` from `.env.example` when you run any `php artisan` command if it doesn't exist. You'll see a helpful message to run `php artisan key:generate`.

    > **Tip**: Use `./utils/deploy.sh --skip-git-sync` to deploy local uncommitted changes without git pull. This is useful during development when you want to test changes before committing.
    >
    > **Tip**: Use `./utils/deploy.sh --skip-build` for faster deployments when you've already built the Docker images and just need to restart containers or run database migrations.

2.  **Access the app**
    - **Main App**: http://localhost:8000
    - **Admin Panel**: http://localhost:8000/admin (admin@catarchy.space / password)
    - **API Docs**: http://localhost:8000/api/documentation
    - **Project Docs**: http://localhost:8000/docs (VitePress)

3.  **Optional: Enable HTTPS for local dev (single compose)**

    ```bash
    # Set in backend/.env
    APP_ENV=development
    ENABLE_HTTPS=true

    # Generate self-signed certificates (one-time setup)
    # Note: script will NOT overwrite existing certs; use --force to regenerate
    ./utils/generate-dev-certs.sh

    # Deploy using the single entry point
    ./utils/deploy.sh

    # Access via HTTPS
    # https://localhost (browser will show security warning - click "Advanced" → "Proceed")
    # https://localhost/admin
    # https://localhost/docs
    ```

    **Why HTTPS in dev?**
    - Test features requiring secure context (Service Workers, Web Crypto API, etc.)
    - Match production behavior more closely
    - Test HTTPS-specific security headers

    **Production note**: Production deployments use `docker-compose.yml` only (no dev override). HTTPS is handled by reverse proxy (nginx/caddy/traefik) with proper certificates.

4.  **Generate API Client**

    If you change the backend API (@OA annotations), you must regenerate the frontend types and hooks:

    ```bash
    cd frontend
    bun run api:generate
    ```

    This command:
    1.  Fetches `storage/api-docs/api-docs.json` (ensure your backend is running or you've run `php artisan l5-swagger:generate`).
    2.  Generates TypeScript interfaces and React Query hooks using **Orval**.
    3.  Applies custom transformations (e.g., stripping `/api` prefix, unwrapping data envelopes).

    **Usage**: Refer to `frontend/src/api/generated/` for the output. Prefer using the generated hooks (`useGetPets`, `usePostPets`, etc.) over manual Axios calls for full type safety.

    See [API Conventions](docs/api-conventions.md) for more details on full-stack typesafety.

**Test Users (Seeded Data)**

- **Super Admin**: admin@catarchy.space / password
- **Admin**: user1@catarchy.space / password
- **Regular Users**: 3 users with factory-generated names/emails / password

**Admin Features**

- **User Impersonation**: Click 👤 icon in Users table to impersonate any user
- **Stop Impersonating**: Use navbar indicator or admin panel to return
- **User Ban/Unban**: Ban users to put them in read-only mode (view-only, no writes); unban to restore full access

## Testing

### Backend (Pest/PHPUnit)

**Always run backend tests inside the Docker container** to ensure proper extensions and PHP version.

Tests run in **parallel** by default for faster execution.

```bash
# Run all tests (parallel by default)
cd backend && php artisan test --parallel

# Run tests without parallel execution
cd backend && php artisan test --no-parallel

# Run specific test suites
cd backend && php artisan test --parallel --testsuite=Feature
cd backend && php artisan test --parallel --testsuite=Unit
```

**Running tests locally (outside Docker):**

If you need to run tests on your local machine:

```bash
cd backend

# First time only - .env will be auto-created from .env.example
composer install
php artisan key:generate

# Configure your local database settings in .env, then run tests
php artisan test --parallel
```

### Frontend (Vitest)

```bash
cd frontend

# Run all tests
bun test

# Interactive UI
bun run test:ui

# Coverage report
bun run test:coverage
```

### End-to-End (Playwright)

Playwright E2E tests live under `frontend/e2e/` and run against the dev server.

Quick start:

```bash
# In one terminal (dev server)
cd frontend
bun run dev

# In another terminal (from repo root)
bun run e2e            # headless run
bun run e2e:ui         # interactive UI
bun run e2e:report     # open last HTML report
```

## Static Analysis & Quality Gates

### Code Quality (Formatting)

Run Laravel Pint to automatically format code according to PSR-12 and Laravel conventions.

```bash
# From the backend directory
cd backend
./vendor/bin/pint
```

### PHPStan (Backend Type Analysis)

PHPStan enforces type safety and catches bugs at write-time using static analysis. Currently configured at **Level 5**.

**Run analysis:**

```bash
cd backend
composer phpstan
```

### Deptrac (Architecture Layer Enforcement)

Deptrac prevents architectural violations by enforcing allowed dependencies between layers.

**Run analysis:**

```bash
cd backend
composer deptrac
```

## Asset Management

### Updating Icons

Use `utils/update_icon.sh` to regenerate the favicon, PWA icons, and manifest whenever the branding icon changes.

```bash
./utils/update_icon.sh /absolute/path/to/new/icon.png
```

The script requires ImageMagick (`convert`) and updates both `frontend/public` and `backend/public` assets so backend and SPA entry points stay in sync.
