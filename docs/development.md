# Development Guide

Quick reference for running, developing, and testing Meo Mai Moi - the cat care management platform.

## Quick Start

**New to the repo?** Follow these steps to get running:

1. **Run the app**
   ```bash
   docker compose up -d --build
   ```
   
   **For development/testing:** If you need to run backend tests, rebuild with dev dependencies:
   ```bash
   docker compose build --build-arg INSTALL_DEV=true backend
   docker compose up -d backend
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
docker compose exec backend ./vendor/bin/phpunit
cd frontend && npm test

# Generate coverage reports
cd frontend && npm run test:coverage  # → frontend/coverage/index.html

# Stop services
docker compose down
```

## Tech Stack Overview

**Backend**: Laravel 12 + PHP 8.4
- Cat profile management with comprehensive health tracking
- Vaccination scheduling and reminder system
- Weight monitoring with trend analysis
- Care routine scheduling and notifications
- Email notifications & admin panel
- Sanctum auth + Spatie permissions
- Full OpenAPI documentation

**Frontend**: React 18 + TypeScript + Vite
- Cat profiles with photo timelines
- Health dashboard with vaccination tracking
- Weight charts and health insights
- Care scheduling interface
- Mobile-responsive design
- shadcn/ui + Tailwind CSS
- 238+ tests with Vitest

## Related Documentation

- [Email Configuration](./email_configuration.md) - SMTP and Mailgun setup with test email logging
- [Notification Templates Admin](./notifications.md) - Registry, file defaults, DB overrides, admin usage
- [Testing Guide](./testing.md) - Comprehensive testing instructions
- [Git Workflow](./git-workflow.md) - Branching strategy and conflict resolution
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Deployment](./deploy.md) - Production deployment guide
- [Architecture](../GEMINI.md) - System architecture overview

## Email Configuration

Set up SMTP and Mailgun email configurations with test email logging:

```bash
# Quick setup with your domain settings
php artisan email:setup

# Setup with credentials and activate
php artisan email:setup \
  --smtp-username=your-email@gmail.com \
  --smtp-password=your-app-password \
  --activate=smtp

# Access admin panel
# → http://localhost:8000/admin/email-configurations
# → http://localhost:8000/admin/email-logs
```

See the [Email Configuration Guide](./email_configuration.md) for detailed setup instructions.

## Quick Commands

```bash
# Development
docker compose up -d --build
docker compose exec backend ./vendor/bin/phpunit
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

### PHP Insights (Holistic Quality Score)

PHP Insights provides a unified quality score (0-100) across four dimensions: Code, Complexity, Architecture, and Style. Think of it as a health dashboard for your codebase.

**Current Baseline (2025-10-09):**
- **Code**: 84.4 pts (7020 lines analyzed)
- **Complexity**: 79.5 pts (avg cyclomatic complexity: 1.98)
- **Architecture**: 81.3 pts (112 files, 92% classes)
- **Style**: 75.6 pts (0 security issues)

**Run analysis:**
```bash
cd backend
composer insights
```

**Minimum thresholds** (enforced by composer script):
- Quality: 80+
- Complexity: 75+
- Architecture: 75+
- Style: 75+

**What each dimension measures:**
- **Code**: Comments coverage, class/function distribution, code organization
- **Complexity**: Cyclomatic complexity (branching/nesting), cognitive load
- **Architecture**: Class structure (interfaces, traits, globals), coupling
- **Style**: PSR standards, import ordering, naming conventions

**Configuration:**
- `backend/config/insights.php` - Exclusions, custom rules, removed checks
- Excludes: migrations, seeders, Filament (auto-generated), config, vendor

**Common issues flagged:**
- Public properties (use getters/setters)
- Unordered imports (alphabetical)
- Missing type hints (though we allow mixed in Laravel context)
- Cognitive complexity (deeply nested logic)

**Interpreting scores:**
- **80-100**: Green zone (production-ready)
- **50-79**: Yellow zone (needs attention)
- **1-49**: Red zone (refactor urgently)

**Strategy:**
Current baseline is solid (all categories 75+). Focus on:
1. Keep scores above thresholds during i18n work
2. Address public property warnings in Mail classes incrementally
3. Monitor complexity as translation logic is added
4. Use as pre-commit gate once stable

---

## Frontend Quality Gates

### ESLint & TypeScript Strict Mode

**Current Configuration:**
- ESLint: `strictTypeChecked` + `stylisticTypeChecked` (0 violations)
- TypeScript: `strict: true` + `noUncheckedIndexedAccess: true`

**Run checks:**
```bash
cd frontend
npm run lint          # ESLint with caching
npm run typecheck     # TypeScript compilation check
```

**What's enforced:**
- Type safety (no implicit any, strict null checks)
- Array access returns `T | undefined` (prevents index out-of-bounds bugs)
- React hooks rules (exhaustive deps, no conditional hooks)
- Modern React patterns (no deprecated APIs)

**Test file relaxation:**
Test and mock files have relaxed rules for readability:
- Allow `any` types
- Allow unsafe assignments
- Skip exhaustive awaits
- Relax template expression restrictions

### dependency-cruiser (Architecture Rules)

**Current Rules:**
- **no-pages-to-pages** (warn): Pages shouldn't import other pages directly (except tests)
- **no-api-dep-on-ui** (error): API layer must stay isolated from UI components

**Baseline:** 0 violations (199 modules, 455 dependencies analyzed)

**Run analysis:**
```bash
cd frontend
npm run lint:deps
```

**Configuration:** `frontend/.dependency-cruiser.cjs`

**Why these rules:**
- Pages are route entry points, not reusable components
- API layer independence enables future backend swaps
- Prevents circular dependencies
- Enforces unidirectional data flow

### ts-prune (Dead Code Detection)

**Baseline:** 89 findings (mix of intentionally exposed exports + potential dead code)

**Run scan:**
```bash
cd frontend
npm run lint:dead
```

**Interpreting output:**
- `(used in module)` - Exported but only used internally (often fine)
- No marker - Potentially unused export (review candidates)

**Strategy:**
1. Review unmarked exports quarterly
2. Don't auto-remove `(used in module)` items (may be intentional API surface)
3. Prioritize removing unused utility functions before components
4. Use as informational tool, not CI blocker initially

**Note:** Some "unused" exports are intentional:
- Public API surface for future features
- Type exports for consumers
- Utility functions in shared modules

---
## Supply Chain Security

### Composer Audit (Backend Dependencies)

Used to detect known security advisories in PHP dependencies.

**Run audit:**
```bash
cd backend
composer audit --locked
```

**Current Baseline (2025-10-09):**
- 0 security advisories
- 1 abandoned package: `qossmic/deptrac` (suggested: `deptrac/deptrac`) — monitored, non-critical

**Add to CI:** (future task)
- Run daily or per PR
- Fail only on new advisories (allow list legacy if needed)

**Response Playbook:**
1. Evaluate severity (critical/high first)
2. Check changelog of patched version
3. Run test suite + quality gates
4. Merge patch promptly if safe

### npm Audit (Frontend Dependencies)

Currently informational (2 vulnerabilities: 1 low, 1 high). Will integrate after i18n foundation to avoid noise. Strategy: switch to `npm audit --production` for runtime focus, and track dev-only separately.

---