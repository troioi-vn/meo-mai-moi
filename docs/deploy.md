# Production Deployment Guide

Safe, repeatable, and rollback-friendly steps for deploying Meo Mai Moi.

TL;DR
- docker compose exec backend php artisan down
- ./scripts/backup.sh
- git pull origin main
- docker compose up -d --build
- docker compose exec backend php artisan migrate --force
- docker compose exec backend php artisan optimize:clear
- docker compose exec backend php artisan up
- Verify: docker compose ps && docker compose logs backend && open site

Prerequisites
- docker and docker compose installed
- Repo cloned and working directory at project root
- Scripts executable: chmod +x scripts/backup.sh scripts/restore.sh

Environment and assets
- Docker passes env via backend/.env.docker; container ensures /var/www/.env and APP_KEY.
- Frontend assets are built as part of the Docker image build (vite build + copy to backend/public/build). No extra steps needed on server besides docker compose up -d --build.

Deployment workflow
Phase 1: Prepare
1) Maintenance mode
    - docker compose exec backend php artisan down
2) Backup
    - ./scripts/backup.sh  # DB + uploads to scripts/backups/

Phase 2: Deploy
3) Pull latest
    - git pull origin main  # or your prod branch
4) Rebuild + restart
    - docker compose up -d --build
5) DB migrations
    - docker compose exec backend php artisan migrate --force
6) Clear caches
    - docker compose exec backend php artisan optimize:clear

Phase 3: Go live and verify
7) Disable maintenance
    - docker compose exec backend php artisan up
8) Verify
    - docker compose ps
    - docker compose logs backend | tail -n 100
    - Health endpoint: curl -f http://localhost:8000/api/version

Emergency rollback
1) Maintenance mode
    - docker compose exec backend php artisan down
2) Restore backup
    - ./scripts/restore.sh  # interactive: DB and/or uploads
3) Revert code
    - git log
    - git checkout <good-commit>
4) Re-deploy old version
    - docker compose up -d --build
    - docker compose exec backend php artisan migrate --force
    - docker compose exec backend php artisan optimize:clear
5) Disable maintenance
    - docker compose exec backend php artisan up