---
inclusion: always
---

# Troubleshooting Guide

## Common Issues & Solutions

### Backend Issues

**Database Connection Errors**
```bash
# Check PostgreSQL is running
docker compose ps db
# Reset database using deploy script (recommended)
./utils/deploy.sh --fresh --seed
# Or manually
docker compose exec backend php artisan migrate:fresh --seed
```

**Login Issues (Admin Password Corruption)**
```bash
# Use deploy script (includes automatic password verification)
./utils/deploy.sh
# Or manually reset admin password
docker compose exec backend php artisan tinker --execute="
\$user = App\Models\User::where('email', 'admin@catarchy.space')->first();
\$user->password = Hash::make('password');
\$user->save();
echo 'Admin password reset';
"
```

**Seeding Issues**
- Deploy script automatically handles seeding dependencies
- Creates exactly 5 users (2 admin + 3 regular) with 2 pets each
- Use `./utils/deploy.sh --fresh --seed` for clean test data
- Pet images are automatically copied/generated during seeding

**Test Failures with RefreshDatabase**
- Install `postgresql-client` if `psql` command missing
- Ensure `PetTypeSeeder` runs before pet-related tests
- Clear caches: `php artisan optimize:clear`

**403 Errors in Tests (Policy Issues)**
- Check user roles and permissions in test setup
- Verify factories create users with proper states
- Inspect `response->json()` for detailed error info

**File Upload Issues**
- Verify storage link: `php artisan storage:link`
- Check permissions on `storage/app/public`
- Review `docker-entrypoint.sh` for runtime setup

**OpenAPI Generation Errors**
- Fix `@OA` annotation syntax (brackets, commas)
- Re-run: `php artisan l5-swagger:generate`
- Check controller method annotations

### Frontend Issues

**Build Failures**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run typecheck`
- Verify all imports are correct

**Test Environment Issues**
- Radix/shadcn components need polyfills in `setupTests.ts`
- MSW handlers must use absolute URLs
- Mock `sonner` toasts to avoid test failures

**Hot Reload Not Working**
- Ensure Vite dev server is running: `cd frontend && npm run dev`
- Check port 5173 is accessible
- Verify proxy configuration in Vite config

### Docker Issues

**Container Won't Start**
- Check logs: `docker compose logs backend`
- Use deploy script: `./utils/deploy.sh --no-cache`
- Verify environment files exist

**Permission Errors**
- Check file ownership in containers
- Verify volume mounts in docker-compose.yml
- Run commands with proper user context

**Data Persistence Issues**
- Use `./utils/deploy.sh` (without --fresh) to preserve data
- Check Docker volumes: `docker volume ls | grep meo-mai-moi`
- Verify pgdata volume exists and has correct permissions

### Impersonation Issues

**Impersonation Action Not Visible**
- Ensure user has admin or super_admin role
- Clear Filament cache: `php artisan optimize:clear`
- Check filament-users config: `'impersonate' => true`

**Stop Impersonating Not Working**
- Check impersonation API endpoints are accessible
- Verify session middleware is properly configured
- Clear browser cache and try again

## Debugging Workflow

1. **Observe** - Get exact error message and context
2. **Isolate** - Check backend logs, browser devtools, test output
3. **Fix** - Address one hypothesis at a time
4. **Verify** - Rebuild/restart, clear caches, retest

## Performance Issues

**Slow Tests**
- Use `--parallel` flag for backend tests
- Check database seeding efficiency
- Consider test database optimization

**Slow Frontend Build**
- Check for circular dependencies
- Optimize import statements
- Review bundle analyzer output

## Quality Gate Failures

**PHPStan Errors**
- Review type annotations
- Check for missing return types
- Update baseline if intentional: `composer phpstan:baseline`

**Deptrac Violations**
- Review layer dependencies in `deptrac.yaml`
- Refactor to follow architecture rules
- Update baseline only after intentional changes