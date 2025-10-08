# Development Guide

Quick reference for running, developing, and testing Meo Mai Moi locally.

## Quick Start

**New to the repo?** Follow these steps to get running:

1. **Run the app**
   ```bash
   docker compose up -d --build
   ```

2. **Initialize (first time only)**
   ```bash
   docker compose exec backend php artisan migrate:fresh --seed
   docker compose exec backend php artisan shield:generate --all
   docker compose exec backend php artisan storage:link
   ```

3. **Access the app**
   - Main app: http://localhost:8000
   - Admin panel: http://localhost:8000/admin (admin@catarchy.space / password)
   - API docs: http://localhost:8000/api/documentation

## Daily Workflow

```bash
# Start services
docker compose up -d

# Frontend development (hot reload)
cd frontend && npm run dev  # → http://localhost:5173

# Run tests
docker compose exec backend php artisan test
cd frontend && npm test

# Generate coverage reports
cd frontend && npm run test:coverage  # → frontend/coverage/index.html

# Stop services
docker compose down
```

## Tech Stack Overview

**Backend**: Laravel 12 + PHP 8.4
- Pet management with health tracking
- Placement & transfer workflows  
- Email notifications & admin panel
- Sanctum auth + Spatie permissions
- Full OpenAPI documentation

**Frontend**: React 18 + TypeScript + Vite
- Pet profiles & health management
- Request workflows & notifications
- shadcn/ui + Tailwind CSS
- 238+ tests with Vitest

## Related Documentation

- [Testing Guide](./testing.md) - Comprehensive testing instructions
- [Git Workflow](./git-workflow.md) - Branching strategy and conflict resolution
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Deployment](./deploy.md) - Production deployment guide
- [Architecture](../GEMINI.md) - System architecture overview

## Quick Commands

```bash
# Development
docker compose up -d --build
docker compose exec backend php artisan test
cd frontend && npm test && npm run lint

# Code quality
docker compose exec backend ./vendor/bin/pint
cd frontend && npm run typecheck

# Coverage reports
cd frontend && npm run test:coverage

# Reset environment
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
```

---

## Static Analysis & Quality Gates

### PHPStan (Backend Type Analysis)

PHPStan enforces type safety and catches bugs at write-time using static analysis. Currently configured at **Level 5** (recommended Laravel starting point).

**Run analysis:**
```bash
cd backend
composer phpstan
```

**Update baseline (when intentionally adding new patterns):**
```bash
composer phpstan:baseline
```

**Configuration:**
- `backend/phpstan.neon` - Rules, paths, exclusions
- `backend/phpstan-baseline.neon` - Known issues snapshot (if exists)

**Level progression:**
- Level 5: Current baseline (medium strictness)
- Level 6: Planned after Deptrac & PHP Insights mature
- Level 7: Target for i18n foundation code

### Deptrac (Architecture Layer Enforcement)

Deptrac prevents architectural violations by enforcing allowed dependencies between layers. Think of it as a compiler for your architecture decisions.

**Current Layers:**
- `Domain` (Models, Enums) - Core business entities
- `Services` - Business logic orchestration
- `Notifications` - Email/push notification classes
- `Mail` - Mailable classes
- `Http` - Controllers, middleware, requests
- `Console` - Artisan commands
- `Providers` - Service container bindings
- `Policies` - Authorization logic

**Allowed Dependencies (simplified):**
```
Http → Services → Domain
Services → Domain
Notifications → Services + Domain
Mail → Services + Domain
Console → Services + Domain
Policies → Domain
Providers → Services + Domain
Domain → (nothing)
```

**Run analysis:**
```bash
cd backend
composer deptrac
```

**Interpreting output:**
- **Violations**: Layer rules breached (build fails on new violations)
- **Skipped violations**: Baselined (10 currently; frozen to prevent drift)
- **Uncovered**: Classes not yet assigned to layers (767 currently; acceptable during early phase)
- **Allowed**: Valid dependencies following the rules

**Update baseline (after intentional refactor):**
```bash
composer deptrac:baseline > deptrac.baseline.yaml
# Then merge the new skip_violations into deptrac.yaml
```

**Configuration:**
- `backend/deptrac.yaml` - Layer definitions, rules, baseline
- Inline `skip_violations` section contains baselined dependencies

**Strategy:**
1. Baseline captures current state (prevents regression)
2. New violations fail the build
3. Gradually refactor baselined violations over time
4. Classify more namespaces into layers as needed (Events, Jobs, Listeners currently uncovered)

**Why baseline early?**
Without a baseline, teams ignore noisy output. With it, the quality bar only moves forward—new violations are blocked while you refactor the legacy gradually.

---