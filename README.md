# Meo Mai Moi — Cat Care Management Platform

Helping cat (and other pets) owners manage with health tracking, vaccination reminders, weight monitoring, and care scheduling. Built with Laravel, React, and PostgreSQL.

## What is Meo Mai Moi?

Meo Mai Moi is a comprehensive pet care platform designed to help cat owners (and other pet owners) stay on top of their companions' health and wellbeing. Many pet owners struggle to remember vaccination schedules, track weight changes, or maintain organized health records - especially when managing multiple pets.

**The Problem**: Pet owners often rely on scattered notes, calendar reminders, or memory to track their pets' health needs. This leads to missed vaccinations, unnoticed weight trends, and disorganized medical records that are crucial during vet visits.

**Our Solution**: A centralized platform that makes pet care management effortless with automated reminders, visual health tracking, and comprehensive record keeping.

**Who It's For**:
- **Dedicated Cat Owners**: Our primary focus - people who want the best care for their feline companions
- **Multi-Pet Households**: Families managing several cats or mixed pets with individual care needs  
- **Health-Conscious Pet Parents**: Owners who want to track trends and catch health issues early
- **Busy Pet Owners**: People who need automated reminders and organized records

*Future expansion: Pet rehoming and adoption features planned after establishing core cat care functionality.*

Dockerized • Laravel 12 • React 19 • Vite 7 • PostgreSQL 14 • Filament 3

## Quick Start (Docker)

1) Clone and setup
```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
# Prepare Docker env file (will prompt for APP_URL and FRONTEND_URL, or keep defaults)
./utils/ensure-docker-env.sh
# Build and start containers
docker compose up -d --build
# Optional: initialize app data
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

Access:
- App: http://localhost:8000
- Admin: http://localhost:8000/admin (admin@catarchy.space / password) (local dev)

## Documentation

- Development guide: docs/development.md
- Deployment: docs/deploy.md
- Project docs site: docs/index.md
- Agent/architecture: GEMINI.md

## How to Participate

We welcome contributions of all sizes — features, fixes, tests, and docs.

1) Get set up (Docker Quick Start)
```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
./utils/ensure-docker-env.sh
docker compose up -d --build
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

2) Read the Development Guide
- Start here for local setup, daily workflow, testing, and Git practices to avoid merge conflicts: `docs/development.md`

3) Create a branch and code
```bash
git checkout -b feature/your-change
# make small, focused commits
git add -p && git commit -m "feat: do one thing"
```

4) Run tests and format
```bash
# Backend
docker compose exec backend php artisan test
cd backend && ./vendor/bin/pint

# Frontend
cd frontend && npm test
cd frontend && npm run lint && npm run typecheck
```

5) Open a Pull Request
- Push your branch and open a PR to `dev`. Keep PRs small when possible.
- Include screenshots for UI changes and mention tests added/updated.

For architecture context, see `GEMINI.md` (AI Agent Guide).

## Core Features (MVP Focus)

**Cat Care Management**:
- **Cat Profiles**: Comprehensive profiles with photos, breed info, and personality traits
- **Health Tracking**: Medical records, vaccination schedules, and appointment reminders
- **Weight Monitoring**: Regular weight tracking with visual charts and health insights
- **Care Scheduling**: Feeding schedules, medication reminders, and routine care tasks
- **Veterinary Integration**: Vet contact management and appointment history
- **Multi-Cat Support**: Manage multiple cats with individual profiles and care plans

**Admin Panel Features**:
- Cat profile management with health record oversight
- Weight tracking analytics and health trend monitoring
- Vaccination reminder system with email notifications
- User account management and verification
- Care schedule templates and customization
- Health alert configuration and monitoring
- RBAC: Spatie Permission + Filament Shield

*Future Features*: Pet rehoming, foster networks, and adoption workflows will be added after establishing the core cat care platform.