# Backend Setup

## Environment Configuration

This project uses `.env.example` as the environment template.

### Automatic .env Creation

When you run any `php artisan` command, if `.env` doesn't exist, it will be **automatically created** from `.env.example`.

**Example:**

```bash
# Fresh clone, after running composer install
composer install
php artisan test

# Output:
# ✓ Created .env from .env.example
# ⚠ Please update .env with your configuration (especially APP_KEY)
#   Run: php artisan key:generate
```

### Fresh Clone Setup

```bash
# 1. Clone the repository
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi/backend

# 2. Install dependencies
composer install

# 3. Run any artisan command - .env will be auto-created
php artisan key:generate

# 4. Configure database and run migrations
php artisan migrate
```

### Manual Setup

If you prefer manual setup:

```bash
# Copy the example file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure your database and other settings
nano .env
```

### Docker vs Local Development

-   **Docker**: Environment managed by dual-file system (root `.env` for Docker Compose, `backend/.env` for Laravel)
-   **Local**: Use `.env.example` as template and adjust `DB_HOST=localhost` and other local settings

## Running Tests

```bash
# Tests will auto-create .env if needed
php artisan test

# Or run specific test suites
./vendor/bin/phpunit
./vendor/bin/phpunit --testsuite Feature
```

## Common Commands

```bash
# Database
php artisan migrate
php artisan migrate:fresh --seed

# Cache
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Code Quality
./vendor/bin/pint          # Format code
./vendor/bin/phpstan       # Static analysis
```
