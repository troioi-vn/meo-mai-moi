# Meo Mai Moi — Cat Rehoming Platform Engine

Connecting owners, fosters, and adopters to help cats find new homes. Built with Laravel, React, and PostgreSQL.

**Badges:** Dockerized • Laravel 11 • React 19 • Vite 7 • PostgreSQL 14 • Filament 3

## Contents
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development](#local-development)
- [Admin Panel Features](#admin-panel-features)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [License](#license)

## Quick Start (Docker)

**1. Clone and Setup**
```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
cp backend/.env.docker.example backend/.env.docker
```

**2. Build and Initialize**
```bash
# Start containers
docker compose up -d --build

# Initialize database with sample data
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

**3. Access the Application**
- **Frontend:** http://localhost:8000
- **Admin Panel:** http://localhost:8000/admin
  - **Email:** `admin@catarchy.space`
  - **Password:** `password`

**Daily Workflow:**
- **Start:** `docker compose up -d`
- **Stop:** `docker compose down`
- **Rebuild:** `docker compose up -d --build`
- **Reset Database:** `docker compose exec backend php artisan migrate:fresh --seed`

---

## Local Development

### Option 1: Docker Development (Recommended)

Follow the [Quick Start](#quick-start-docker) instructions above for the fastest setup with all dependencies included.

### Option 2: Native Development (Without Docker)

**Requirements:**admin@catarchy.space PHP 8.4+, Composer, Node.js 18+, SQLite

**1. Backend Setup**
```bash
cd backend

# Environment setup
cp .env.example .env

# Install dependencies
composer install

# Application setup
php artisan key:generate
php artisan migrate:fresh --seed
php artisan shield:generate --all
php artisan storage:link

# Start development server
php artisan serve
```

**2. Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Start development server with hot-reloading
npm run dev
```

**3. Access Points**
- **Backend API:** http://localhost:8000
- **Frontend:** http://localhost:5173 (proxies to backend)
- **Admin Panel:** http://localhost:8000/admin
  - **Email:** `admin@catarchy.space`
  - **Password:** `password`

---

## Admin Panel Features

The admin panel is built with **Filament 3** and includes comprehensive management tools:

### 🐱 **Cat Management**
- View all cats with photos, status, and owner information
- Filter by status (available, adopted, fostered, etc.)
- Manage cat profiles, medical records, and weight history
- Photo gallery management

### 👥 **User & Helper Management**
- User profiles with role-based permissions
- Helper profile verification and approval
- Suspension and moderation tools
- Profile photo management

### 🏠 **Placement & Transfer System**
- Placement request management
- Transfer request workflow
- Foster assignment tracking
- Handover documentation

### ⭐ **Review Moderation** (New!)
- View all user reviews with star ratings
- **Moderation Tools:**
  - Hide/show individual reviews
  - Flag inappropriate content
  - Bulk moderation actions
- **Advanced Filtering:**
  - Filter by status (active, hidden, flagged)
  - Filter by rating (1-5 stars)
  - Date range filtering
- **Content Management:**
  - Review content preview with tooltips
  - Moderation notes and tracking
  - Moderator assignment

### 🔐 **Permissions & Roles**
- Role-based access control with Spatie Laravel Permission
- Filament Shield integration for granular permissions
- Super admin capabilities

### 📊 **Sample Data**
The seeded database includes:
- **20 sample reviews** (15 active, 3 flagged, 2 hidden)
- **Multiple user roles** (admin, helper, cat owner)
- **Sample cats** with photos and medical records
- **Transfer and placement requests**

---

## Testing

### Backend Tests (Pest/PHPUnit)
```bash
# With Docker
docker compose exec backend php artisan test

# Without Docker
cd backend && php artisan test

# Run specific test
php artisan test tests/Feature/ReviewResourceTest.php
```

### Frontend Tests (Vitest)
```bash
cd frontend
npm test
```

### Test Coverage
- **Feature Tests:** API endpoints, resource management, permissions
- **Unit Tests:** Model relationships, validation, business logic
- **Integration Tests:** Admin panel functionality, user workflows

---

## Troubleshooting

### Common Issues

**🔧 Storage Link Permission Denied**
```bash
# Docker
docker compose exec backend php artisan storage:link

# Native
sudo chown -R $USER:$USER backend/storage backend/bootstrap/cache
chmod -R 775 backend/storage backend/bootstrap/cache
```

**🔧 Frontend Build Errors**
```bash
# Fix permissions
chown -R $USER:$USER backend/public
chmod -R u+rwX,go+rX backend/public

# Rebuild frontend
cd frontend && npm run build
```

**🔧 Admin Panel 403 Errors**
```bash
# Regenerate permissions
php artisan shield:generate --all
php artisan db:seed --class=ShieldSeeder

# Create super admin
php artisan shield:super-admin
```

**🔧 Database Issues**
```bash
# Reset database with fresh data
php artisan migrate:fresh --seed
php artisan shield:generate --all
```

**🔧 Missing Welcome View**
```bash
# Build frontend to generate Blade views
cd frontend && npm run build
```

### Development Tips

- **Hot Reloading:** Frontend runs on port 5173 with Vite hot-reloading
- **API Testing:** Use `/api/` endpoints for frontend integration
- **Admin Access:** Always use super admin account for full permissions
- **Sample Data:** Run seeders to populate with realistic test data

---

## Deployment

See `docs/deploy.md` for production deployment with:
- Maintenance mode and zero-downtime updates
- Database backups and rollback procedures
- Environment-specific configurations
- SSL and security hardening

## License

This project is licensed under the **MIT License**.

Contributor notes
See GEMINI.md for an agent-oriented overview of architecture and workflows.