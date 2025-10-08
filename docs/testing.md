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