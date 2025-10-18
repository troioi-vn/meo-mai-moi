---
inclusion: manual
---

# Steering Files Overview

This directory contains comprehensive guidance for developing the Meo Mai Moi pet rehoming platform. These files are automatically included in AI assistant context to ensure consistent development practices.

## File Structure

### Always Included
- **project-overview.md** - Project context, current state, and active development areas
- **development-workflow.md** - Quick start commands, testing requirements, and Git workflow
- **architecture-patterns.md** - Backend/frontend patterns, layer structure, and conventions
- **troubleshooting-guide.md** - Common issues, debugging workflow, and solutions
- **coding-standards.md** - Code style, naming conventions, and best practices

### Manual Inclusion
- **README.md** - This overview file (include with `#steering`)

## How to Use

These steering files are automatically loaded to provide context about:
- Project architecture and current MVP state
- Development workflow and quality gates
- Coding standards and testing patterns
- Common troubleshooting scenarios
- Best practices for Laravel + React development

## Key Project Context

**Meo Mai Moi** is a cat care management platform built with:
- Laravel 12 + PHP 8.4 backend
- React 19 + TypeScript frontend  
- PostgreSQL 14 database
- Docker containerization
- Filament 3 admin panel

**Current Status**: Close to MVP with focus on cat care features:
- Vaccination reminder system
- Advanced weight tracking and health insights
- Care routine scheduling and templates
- Mobile-responsive cat care dashboard

**Technical Development**:
- Dynamic invite system
- Email notification templates
- Multilanguage preparation (i18n)

## Quality Standards

The project maintains high quality through:
- PHPStan Level 5 static analysis
- Deptrac architecture enforcement
- ESLint + TypeScript strict mode
- Comprehensive test coverage (238+ frontend tests)
- Automated formatting with Pint and Prettier

## Quick Reference

```bash
# Start development
docker compose up -d --build

# Run all tests
docker compose exec backend php artisan test
cd frontend && npm test

# Check quality gates
cd backend && composer phpstan && composer deptrac
cd frontend && npm run lint && npm run typecheck
```

For detailed information, refer to the individual steering files or the main documentation in `docs/development.md`.