# Meo Mai Moi - Project Documentation

Welcome to the official documentation for the Meo Mai Moi project.

## About the Project

Meo Mai Moi is an open-source web application engine designed to help communities build and manage local cat rehoming networks. It provides the tools to connect cat owners, fosters, and adopters in a seamless, community-driven platform.

Our primary goal is to create a geographically modular system that anyone can deploy for their own city or region.

## Project Planning & Technical Details

The core technical design, data models, and development roadmap for this project are managed in our primary planning document. This document serves as the single source of truth for our development process.

-   **For a complete overview of the project's architecture, tech stack, and phased development plan, please see our [GEMINI.md file](../GEMINI.md).**

This documentation site will be expanded over time to include user guides, API references, and deployment instructions.

## Database Configuration

This project uses different databases for different environments:

### Local Development (SQLite)
- **Database**: SQLite (file-based)
- **File**: `backend/database/database.sqlite`
- **Configuration**: Uses `.env` file with `DB_CONNECTION=sqlite`

To run locally:
```bash
cd backend
php artisan serve
```

### Docker/Production (PostgreSQL)
- **Database**: PostgreSQL 14
- **Configuration**: Uses `.env.docker` file with PostgreSQL settings
- **Service**: Runs in Docker container named `db`

To run with Docker:
```bash
# Start the application
docker compose up -d

# First time setup - run migrations and seeding
docker compose exec backend php artisan migrate:fresh --seed
```

### Environment Files
- `.env` - Local development (SQLite)
- `.env.docker` - Docker environment (PostgreSQL)
- `.env.example` - Template for local setup

### Database Commands
```bash
# Local development
php artisan migrate
php artisan db:seed

# Docker environment
docker-compose exec backend php artisan migrate
docker-compose exec backend php artisan db:seed
```

### Requirements
- **Local Development**: PHP 8.4 (matches your development environment)
- **Docker**: Uses PHP 8.4-fpm image automatically

### Troubleshooting
- If you encounter composer dependency issues, ensure you're using PHP 8.4
- For Docker builds, the Dockerfile automatically uses the correct PHP version
- If migrations fail, ensure the database service is running first