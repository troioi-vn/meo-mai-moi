# GEMINI.md — AI Agent Guide

Concise, AI-facing guide for architecture, workflows, testing, and troubleshooting. For full developer instructions, see `docs/development.md`.

## 1) What this app is

Meo Mai Moi is a comprehensive cat care management platform that helps cat owners track their feline companions' health, schedule care routines, and maintain detailed medical records. The platform focuses on proactive cat care with vaccination reminders, weight monitoring, and health insights.

**MVP Strategy**: Launch with dedicated cat care features to build a strong user base of engaged cat owners, then expand to pet rehoming and adoption features in future phases.

**Core Features (MVP Focus)**:
**Cat Care Management**:

- Cat profiles with photos, sex information, and personality traits
- Health tracking with medical records and vaccination schedules
- Weight monitoring with visual charts and trend analysis
- Care scheduling for feeding, medications, and routine tasks
- Veterinary contact management and appointment history
- Multi-cat household support with individual care plans

**System Features**:

- Role-based access control (RBAC) via Spatie Permission
- User impersonation system for admin support and testing
- Email notification system for health reminders and alerts
- Admin panel with cat care analytics and user management
- Photo timeline tracking for growth and memorable moments

## 2) Tech and architecture

- **Backend**: Laravel 12 + PHP 8.4

- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui

- **Database**: PostgreSQL only (all envs). SQLite is not supported.

- **Build/Run**: Dockerized with multi-stage builds; frontend assets copied into backend image.

- **API First**: OpenAPI documented with contract testing.

- **Admin Panel**: Filament 3 with comprehensive pet and user management.

### Key Technical Decisions

- **Authentication**: Session-based with Sanctum

- **File Storage**: Local storage under `storage/app/public`

- **Quality Gates**: PHPStan Level 5, Deptrac architecture enforcement

### Backend Architecture (Laravel)

#### Layer Structure (Enforced by Deptrac)

```

Http (Controllers, Middleware, Requests)

  ↓

Services (Business Logic)

  ↓

Domain (Models, Enums)

```

**Key Patterns**:

- Controllers are thin - delegate to Services

- Services contain business logic and orchestration

- Models are data containers with relationships

- Policies use `$user->can(...)` for authorization

- Use Spatie Permission as single source of truth for RBAC

### Frontend Architecture (React + TypeScript)

#### Component Structure

```

src/

├── components/ui/     # shadcn/ui components

├── components/       # Reusable business components

├── pages/           # Route components (don't import other pages)

├── hooks/           # Custom React hooks

├── lib/             # Utilities and configurations

├── api/             # API client and types

└── mocks/           # MSW handlers for testing

```

**State Management**:

- **React Query** for server state

- **React Hook Form** for form state

- **AuthProvider** for authentication context

- Local state with `useState` for UI state

### Security Patterns

- CSRF protection enabled

- Mass assignment protection via `$fillable`

- File upload validation and sanitization

- Rate limiting on API endpoints

- Input validation via Form Requests

## 2a) Coding Standards & Best Practices

### PHP/Laravel Standards

**Code Style**:

- **Laravel Pint** enforces PSR-12 with Laravel conventions

- Run before commit: `./vendor/bin/pint`

**Naming Conventions**:

- **Models**: Singular PascalCase (`Pet`, `User`, `PlacementRequest`)

- **Controllers**: PascalCase + Controller suffix (`PetController`)

- **Services**: PascalCase + Service suffix (`PetManagementService`)

- **Methods**: camelCase (`createPet`, `updateStatus`)

### TypeScript/React Standards

**Code Style**:

- **ESLint + Prettier** with strict TypeScript rules

- Run before commit: `bun run lint && bun run typecheck`

### Documentation Standards

**Code Comments**:

- Explain **why**, not **what**

- Document complex business logic

**API Documentation**:

- OpenAPI annotations on all endpoints

- Keep swagger docs up to date

## 3) Development basics (quick)

**Quick Start Commands**

```bash
# Start development environment (recommended)
./utils/deploy.sh

# Alternative: Manual Docker setup
docker compose up -d --build

# First-time setup (if not using deploy script)
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

**Access Points**

- **Main App**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin (admin@catarchy.space / password)
- **API Docs**: http://localhost:8000/api/documentation

**Test Users (Seeded Data)**

- **Super Admin**: admin@catarchy.space / password
- **Admin**: user1@catarchy.space / password
- **Regular Users**: 3 users with factory-generated names/emails / password

**Admin Features**

- **User Impersonation**: Click 👤 icon in Users table to impersonate any user
- **Stop Impersonating**: Use navbar indicator or admin panel to return

## 4) Testing

**Backend (Pest/PHPUnit)**:

```bash
cd backend && php artisan test --parallel
```

**Frontend (Vitest + RTL)**:

```bash
cd frontend && bun test
cd frontend && bun run typecheck
```

**E2E Tests (Playwright + MailHog)**:

```bash
cd frontend && bun run test:e2e
cd frontend && bun run test:e2e:keep  # Keep services running for debugging
```

- **Real Email Testing**: Uses MailHog SMTP server for authentic email verification flows
- **Automated Setup**: `E2ETestingSeeder` configures complete test environment with MailHog
- **Email Debugging**: MailHog UI at http://localhost:8025 for viewing captured emails
- **Service Isolation**: Docker profiles ensure e2e services don't interfere with development
- **Comprehensive Testing**: Full registration → email verification → login flow testing
- With schema dumps: tests call `psql` for `RefreshDatabase`; install `postgresql-client` locally if missing.
- Seed dependencies in tests (e.g., `PetTypeSeeder`) to avoid FK and enum gaps.
- MSW for API mocking: global server in `frontend/src/setupTests.ts`; handlers per resource under `frontend/src/mocks` using absolute URLs; mirror `{ data: ... }` API shape.
- `sonner` toasts are mocked in `frontend/src/setupTests.ts`.

## 5) Static Analysis & Quality Gates

- **PHPStan (Level 5):** Enforces type safety in the backend.
  - Run: `cd backend && composer phpstan`
  - Update baseline: `composer phpstan:baseline`
- **Deptrac:** Enforces architectural layers (e.g., Domain, Services, Http).
  - Run: `cd backend && composer deptrac`
  - Update baseline: `composer deptrac:baseline > deptrac.baseline.yaml` (then merge into `deptrac.yaml`)

## 6) Non-obvious workflows

- Frontend build feeds backend views (see `welcome.blade.php`). Docker build compiles frontend first, then copies assets into the backend image.
- Runtime setup happens in `backend/docker-entrypoint.sh` (e.g., `storage:link`). Check here for upload issues.
- Email settings are database-driven via Filament at `/admin/email-configurations`. An active DB config overrides `.env` `MAIL_*`.
- E2E tests use separate database (`meo_mai_moi_testing`) and MailHog email configuration. The `E2ETestingSeeder` automatically sets up the complete test environment including email provider configuration.

## 7) Troubleshooting Guide

**Common Issues & Solutions**

**Backend Issues**

- **Database Connection Errors**:
  - Check PostgreSQL is running: `docker compose ps db`
  - Reset database using deploy script (recommended): `./utils/deploy.sh --fresh --seed`
- **Login Issues (Admin Password Corruption)**:
  - Use deploy script (includes automatic password verification): `./utils/deploy.sh`
- **Test Failures with RefreshDatabase**:
  - Install `postgresql-client` if `psql` command missing.
  - Ensure `PetTypeSeeder` runs before pet-related tests.
  - Clear caches: `php artisan optimize:clear`

**Frontend Issues**

- **Build Failures**:
  - Clear node_modules: `rm -rf node_modules && bun install`
  - Check TypeScript errors: `bun run typecheck`
- **Test Environment Issues**:
  - Radix/shadcn components need polyfills in `setupTests.ts`
  - MSW handlers must use absolute URLs

**Docker Issues**

- **Container Won't Start**:
  - Check logs: `docker compose logs backend`
  - Use deploy script: `./utils/deploy.sh --no-cache`

**E2E Testing Issues**

- **MailHog Not Accessible**:
  - Ensure e2e profile is running: `docker compose --profile e2e ps`
  - Check MailHog API: `curl http://localhost:8025/api/v2/messages`
  - Restart services: `docker compose --profile e2e down && docker compose --profile e2e up -d`
- **Email Configuration Errors**:
  - Verify config: `docker compose exec backend php artisan email:verify-config --env=e2e`
  - Reset email config: `docker compose exec backend php artisan db:seed --class=E2EEmailConfigurationSeeder --env=e2e`
- **Test Database Issues**:
  - Use test database: `DB_DATABASE=meo_mai_moi_testing` in backend/.env.e2e
  - Fresh setup: `docker compose exec backend php artisan migrate:fresh --env=e2e`

## 8) Linting & formatting

- Backend: Laravel Pint (`./vendor/bin/pint`).
- Frontend: ESLint + Prettier + TypeScript (`bun run lint`, `bun run typecheck`).

## 9) Quick commands

- Start (Docker): `docker compose up -d --build`
- Backend tests: `cd backend && php artisan test --parallel`
- Frontend tests: `cd frontend && bun test`
- E2E tests: `cd frontend && bun run test:e2e`
- E2E debug: `cd frontend && bun run test:e2e:keep` (keeps services running)
- Migrate/seed (Docker): `docker compose exec backend php artisan migrate --seed`
- Generate API docs: `php artisan l5-swagger:generate` (generates automatically alongside the openapi spec tests)
- Admin panel: http://localhost:8000/admin
- MailHog UI: http://localhost:8025 (during e2e tests)

For complete workflows (Git, CI, more commands), see `docs/development.md`.
