---
inclusion: always
---

# Meo Mai Moi - Cat Care Management Platform

## Project Overview
Meo Mai Moi is a comprehensive cat care management platform that helps cat owners track their feline companions' health, schedule care routines, and maintain detailed medical records. The platform focuses on proactive cat care with vaccination reminders, weight monitoring, and health insights.

**MVP Strategy**: Launch with dedicated cat care features to build a strong user base of engaged cat owners, then expand to pet rehoming and adoption features in future phases.

## Current Development State
- **Status**: Close to MVP
- **Architecture**: Laravel 12 + React 19 + PostgreSQL 14
- **Deployment**: Dockerized with multi-stage builds
- **Admin Panel**: Filament 3 with comprehensive pet and user management

## Core Features (MVP Focus)
**Cat Care Management**:
- Cat profiles with photos, breed information, and personality traits
- Health tracking with medical records and vaccination schedules
- Weight monitoring with visual charts and trend analysis
- Care scheduling for feeding, medications, and routine tasks
- Veterinary contact management and appointment history
- Multi-cat household support with individual care plans

**System Features**:
- Role-based access control (RBAC) via Spatie Permission
- User impersonation system for admin support and testing
- Email notification system for health reminders and alerts
- Admin panel with cat care analytics and user management
- Photo timeline tracking for growth and memorable moments

## Key Technical Decisions
- **Database**: PostgreSQL only (SQLite not supported)
- **Authentication**: Session-based with Sanctum
- **File Storage**: Local storage under `storage/app/public`
- **API**: OpenAPI documented with contract testing
- **Frontend Build**: Assets compiled into backend Docker image
- **Quality Gates**: PHPStan Level 5, Deptrac architecture enforcement

## Active Development Areas
**Current MVP Focus**:
- Enhanced vaccination reminder system with customizable schedules
- Advanced weight tracking with health insights and alerts
- Care routine templates and scheduling improvements
- Mobile-responsive cat care dashboard

**Technical Development** (from `.kiro/specs/`):
- Dynamic invite system for user onboarding
- Email notification template management for health reminders
- Email confirmation system for user registration security
- Multilanguage preparation (i18n foundation)

**Future Roadmap**:
- Pet rehoming and adoption workflows
- Foster network and placement systems
- Community features and reviews