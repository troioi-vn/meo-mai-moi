---
inclusion: always
---

# Development Workflow & Standards

## Quick Start Commands
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

## Deploy Script Options
```bash
./utils/deploy.sh                          # Normal deploy (preserves data)
./utils/deploy.sh --seed                   # Migrate + seed
./utils/deploy.sh --fresh                  # Reset DB (asks confirmation)
./utils/deploy.sh --fresh --seed           # Fresh + seed
./utils/deploy.sh --no-cache               # Rebuild without cache
```

## Access Points
- **Main App**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin (admin@catarchy.space / password)
- **API Docs**: http://localhost:8000/api/documentation

## Test Users (Seeded Data)
- **Super Admin**: admin@catarchy.space / password
- **Admin**: user1@catarchy.space / password  
- **Regular Users**: 3 users with factory-generated names/emails / password
- **Test Data**: Each user has 1 cat + 1 dog with photos

## Admin Features
- **User Impersonation**: Click 👤 icon in Users table to impersonate any user
- **Stop Impersonating**: Use navbar indicator or admin panel to return
- **Admin Panel Access**: Blue "Admin" button in navbar for admin users

## Testing Requirements
Always run tests before committing:

**Backend (Pest/PHPUnit)**:
```bash
docker compose exec backend php artisan test
```

**Frontend (Vitest + RTL)**:
```bash
cd frontend && npm test
cd frontend && npm run typecheck
```

## Code Quality Gates
These must pass before merging:

**Backend**:
- PHPStan Level 5: `cd backend && composer phpstan`
- Deptrac architecture: `cd backend && composer deptrac`
- Laravel Pint formatting: `./vendor/bin/pint`

**Frontend**:
- ESLint strict: `npm run lint`
- TypeScript strict: `npm run typecheck`
- Test coverage maintained

## Git Workflow
- Branch from `dev` for features: `git checkout -b feature/your-change`
- Keep commits small and focused
- Run quality gates before pushing
- PRs target `dev` branch
- Include screenshots for UI changes

## Docker Development Notes
- Backend tests require dev dependencies: `docker compose build --build-arg INSTALL_DEV=true backend`
- Frontend assets are compiled into backend image during build
- Use `docker compose exec backend php artisan optimize:clear` for cache issues