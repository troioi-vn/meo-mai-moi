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

- Cat management: profiles, photos, medical records, status filters
- Users & helpers: verification, suspension, moderation tools
- Placement & transfer: request workflow, foster assignments, handovers
- Reviews moderation: hide/flag, bulk actions, filters
- RBAC: Spatie Permission + Filament Shield