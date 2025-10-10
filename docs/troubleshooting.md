# Troubleshooting Guide

Common issues and solutions for Meo Mai Moi development.

## Quick Fixes

### Storage Link Permission Denied
```bash
docker compose exec backend php artisan storage:link
```

### Frontend Build Errors or Missing Assets
```bash
cd frontend && npm run build
```

### Admin Panel 403 Errors
```bash
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan db:seed --class=ShieldSeeder
```

### Database Issues
```bash
# Reset database with sample data
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
```

### Missing Welcome View After Fresh Clone
```bash
cd frontend && npm run build
```

## Environment Setup Issues

### Docker Environment File Missing
```bash
cp backend/.env.docker.example backend/.env.docker
```

### Cache Driver Issues
If using `CACHE_DRIVER=database`, create the cache table:
```bash
docker compose exec backend php artisan cache:table
docker compose exec backend php artisan migrate
```

Or switch to file cache in `.env.docker`:
```
CACHE_DRIVER=file
```

## RBAC (Role-Based Access Control)

**Source of truth**: Spatie Laravel Permission (legacy `users.role` column removed)

### Assign Roles
```bash
# In Tinker
php artisan tinker
\App\Models\User::firstWhere('email','admin@catarchy.space')->assignRole('super_admin');

# In code
$user->assignRole('admin');
$user->hasRole(['admin','super_admin']);  // Check roles
$user->can('permission-name');            // Check permissions
```

### Admin Access Issues
```bash
docker compose exec backend php artisan shield:super-admin
```

## Development Tips

- **Hot reloading**: Frontend runs on port 5173 with Vite dev server
- **API testing**: Use `/api` endpoints for frontend integration  
- **Admin access**: Use super admin account for full permissions
- **Sample data**: Run seeders for realistic test data

## Performance Issues

### Container Memory Issues (Exit Code 137)
- Close other heavy containers/processes
- Reduce test parallelism: `export PARATEST=0`
- Increase Docker memory limit in Docker Desktop

### Slow Test Runs
- Run specific test suites instead of all tests
- Use `--stop-on-failure` to catch issues early
- Consider running tests in smaller batches

## Data Migration Issues

### Ownership History Backfill
When deploying ownership_history feature to existing data:

```bash
# Dry run first
php artisan ownership-history:backfill --dry-run

# Execute backfill
php artisan ownership-history:backfill

# For large datasets
php artisan ownership-history:backfill --chunk=500
```

## API Documentation Issues

### Outdated OpenAPI Docs
```bash
docker compose exec backend php artisan l5-swagger:generate
```

### Missing API Routes
Check that routes are properly defined in `routes/api.php` and controllers have proper OpenAPI annotations.

## Common Error Messages

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `SQLSTATE[42P01]: undefined_table` | Missing migration | Run `php artisan migrate` |
| `Class not found` | Autoload cache issue | Run `php artisan optimize:clear` |
| `Permission denied` | File permissions | Check Docker volume mounts |
| `Connection refused` | Service not running | Check `docker compose ps` |
| `Port already in use` | Conflicting services | Stop other services or change ports |

## Email Configuration Issues

### Email configurations not showing in Admin
Possible causes:

- Filters active in the list (e.g., Provider, Active Status, or Valid-only filter)
- Missing database table/migrations not run
- Insufficient permissions for the current admin user
- All configurations deleted (bulk delete) or hidden by search

How to diagnose and fix:

1) Clear filters/search in the Email Configuration list.
2) Ensure migrations exist and are applied:
```
docker compose exec backend php artisan migrate --force
```
3) Verify the table exists and has rows:
```
docker compose exec backend php artisan tinker --execute "\App\Models\EmailConfiguration::count()"
```
4) If count is 0, create a new configuration in Admin → Communication → Email Configuration.
5) If permissions are suspected, grant super admin:
```
docker compose exec backend php artisan shield:super-admin
```
6) If cache/config issues persist:
```
docker compose exec backend php artisan optimize:clear
```

Note: Deleting an active configuration is blocked in the UI. Deactivate first to delete. Bulk delete now requires confirmation.