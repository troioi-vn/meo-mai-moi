# Meo Mai Moi — Cat Rehoming Platform Engine

Connecting owners, fosters, and adopters to help cats find new homes. Built with Laravel, React, and PostgreSQL.

Dockerized • Laravel 11 • React 19 • Vite 7 • PostgreSQL 14 • Filament 3

## Quick Start (Docker)

1) Clone and setup
```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
cp backend/.env.docker.example backend/.env.docker
docker compose up -d --build
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend php artisan shield:generate --all
docker compose exec backend php artisan storage:link
```

Access:
- App: http://localhost:8000
- Admin: http://localhost:8000/admin (admin@catarchy.space / password)

## Documentation

- Development guide: docs/development.md
- Deployment: docs/deploy.md
- Project docs site: docs/index.md
- Agent/architecture: GEMINI.md

## Admin Panel Features (highlights)

- Cat management: profiles, photos, medical records, status filters
- Users & helpers: verification, suspension, moderation tools
- Placement & transfer: request workflow, foster assignments, handovers
- Reviews moderation: hide/flag, bulk actions, filters
- RBAC: Spatie Permission + Filament Shield

## Testing

- Backend: docker compose exec backend php artisan test
- Frontend: (cd frontend) npm test

## Troubleshooting (short)

- Storage link: docker compose exec backend php artisan storage:link
- Admin 403: php artisan shield:generate --all && php artisan db:seed --class=ShieldSeeder
- Reset DB: php artisan migrate:fresh --seed

## License

MIT. See LICENSE if present.

Contributor notes: see GEMINI.md for agent-oriented workflows.