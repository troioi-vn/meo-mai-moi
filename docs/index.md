---
layout: home

hero:
  name: "Meo Mai Moi"
  text: "Project Documentation"
  tagline: "Pet care, rescue, and rehoming software built in Vietnam for the cats who found new chapters."
  actions:
    - theme: brand
      text: Read the Dev Guide
      link: /development
    - theme: alt
      text: Live Demo & Blog
      link: https://project.meo-mai-moi.com/
    - theme: alt
      text: Architecture
      link: /architecture
    - theme: alt
      text: View Features
      link: /features

features:
  - title: Care First
    details: Health records, vaccinations, weight tracking, vet contacts, and continuity of care without spreadsheet chaos.
  - title: Rescue and Rehoming
    details: Placement requests, helper responses, handover tracking, and flexible pet relationships for real rescue workflows.
  - title: Independent by Design
    details: Free core experience, no breeding or sales tools, no investor roadmap, and no engagement-maximizing dark patterns.
---

# Meo Mai Moi

**Mèo** means cat. **Mãi** suggests forever, again and again. **Mới** means new, renewed.

_Cats, always renewed._

Meo Mai Moi is a pet care platform with health tracking, vaccination reminders, weight monitoring, and rehoming features. It grew out of a real rescue life in Vietnam: nine former street cats, too many moving parts to remember safely, and the familiar developer spell, "I'll build a small app for myself."

The result is a Laravel 12 + React 19 monorepo with PostgreSQL, Filament admin, OpenAPI-generated frontend types, and a philosophy that stays stubbornly focused on animals and the people who care for them.

## Start Here

- Project overview and values: [README](./README.md), [Philosophy](./philosophy.md)
- Local setup, testing, and workflow: [Development Guide](./development.md)
- Technical structure and standards: [Architecture](./architecture.md)
- Product capabilities: [Features](./features.md)
- Deployment and operations: [Deploy](./deploy.md), [Troubleshooting](./troubleshooting.md)

## Product Areas

- Pet profiles and care records: [Pet Profiles](./pet-profiles.md)
- Sharing, ownership, and foster flows: [Pet Relationship System](./pet-relationship-system.md)
- Rehoming workflow: [Placement Request Lifecycle](./placement-request-lifecycle.md)
- Community helpers: [Helper Profiles](./helper-profiles.md)
- Taxonomy and classifications: [Categories](./categories.md)
- Notifications and delivery channels: [Notifications](./notifications.md), [Push Notifications](./push-notifications.md)
- Invitations and collaboration: [Invites](./invites.md)

## Platform Reference

- Auth and session model: [Authentication](./authentication.md)
- API envelope and conventions: [API Conventions](./api-conventions.md)
- External API contract and quotas: [API Integration](./api-integration.md)
- Localization strategy: [i18n](./i18n.md)
- Test coverage map for main user journeys: [E2E Coverage Map](./e2e-coverage.md)
- Rate limits: [Rate Limiting](./rate-limiting.md)
- DIY hardware integration: [IoT Integration — Smart Scale](./iot-integration.md)
- Roles and permissions: [Roles](./roles.md)
- Release workflow: [Release](./release.md), [Upgrading](./upgrading.md)

## Running It

```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
./utils/deploy.sh --seed
```

Then open [localhost:8000](http://localhost:8000) for the app, [localhost:8000/admin](http://localhost:8000/admin) for admin, and [localhost:8000/api/documentation](http://localhost:8000/api/documentation) for the API docs.
