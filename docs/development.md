# Development Guide

This guide provides a comprehensive overview of how to get started with development, run tests, and follow our coding standards.

## Quick Start

**New to the repo?** Follow these steps to get running:

1.  **Run the app**
    ```bash
    ./utils/deploy.sh
    ```

2.  **Access the app**
    *   **Main App**: http://localhost:8000
    *   **Admin Panel**: http://localhost:8000/admin (admin@catarchy.space / password)
    *   **API Docs**: http://localhost:8000/api/documentation

**Test Users (Seeded Data)**
- **Super Admin**: admin@catarchy.space / password
- **Admin**: user1@catarchy.space / password  
- **Regular Users**: 3 users with factory-generated names/emails / password

**Admin Features**
- **User Impersonation**: Click 👤 icon in Users table to impersonate any user
- **Stop Impersonating**: Use navbar indicator or admin panel to return

## Testing

### Backend (Pest/PHPUnit)

**Always run backend tests inside the Docker container** to ensure proper extensions and PHP version.

```bash
# Run all tests
docker compose exec backend php artisan test

# Run specific test suites
docker compose exec backend php artisan test --testsuite=Feature
docker compose exec backend php artisan test --testsuite=Unit
```

### Frontend (Vitest)

```bash
cd frontend

# Run all tests
npm test

# Interactive UI
npm run test:ui

# Coverage report
npm run test:coverage
```

### End-to-End (Playwright)

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

## Static Analysis & Quality Gates

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