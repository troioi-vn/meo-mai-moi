# Architecture

This document outlines the architecture of the Meo Mai Moi application, including the tech stack, key technical decisions, and coding standards.

## Tech and architecture

- **Backend**: Laravel 12 + PHP 8.4
- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + shadcn/ui
- **Database**: PostgreSQL only (all envs). SQLite is not supported.
- **Build/Run**: Dockerized with multi-stage builds; frontend assets copied into backend image.
- **API First**: OpenAPI documented with contract testing.
- **Admin Panel**: Filament 3 with comprehensive pet and user management.

### Key Technical Decisions

- **Authentication**: Fortify + Jetstream (API features), session-based via Sanctum for SPA; email verification required by default
- **File Storage**: Local storage under `storage/app/public`
- **Quality Gates**: PHPStan Level 5, Deptrac architecture enforcement

### Backend Architecture (Laravel)

#### Layer Structure (Enforced by Deptrac)

```
Http (Controllers, Middleware, Requests)
  ↓
Services (Business Logic)
  ↓
Domain (Models, Enums)
```

**Key Patterns**:

- Controllers are thin - delegate to Services
- Services contain business logic and orchestration
- Models are data containers with relationships
- Policies use `$user->can(...)` for authorization
- Use Spatie Permission as single source of truth for RBAC

### Frontend Architecture (React + TypeScript)

#### Component Structure

```
src/
├── components/ui/     # shadcn/ui components
├── components/       # Reusable business components
├── pages/           # Route components (don't import other pages)
├── hooks/           # Custom React hooks
├── lib/             # Utilities and configurations
├── api/             # API client and types
└── mocks/           # MSW handlers for testing
```

**State Management**:

- **React Query** for server state
- **React Hook Form** for form state
- **AuthProvider** for authentication context
- Local state with `useState` for UI state

**UI Component Library**:

- **shadcn/ui**: All 24 components installed and configured for Tailwind v4
  - Copy-paste component architecture (components owned by the project)
  - Built on Radix UI primitives for accessibility
  - Fully customizable with Tailwind CSS
- **Tailwind CSS v4**: Modern utility-first CSS framework
  - Uses `@import 'tailwindcss'` syntax (v4 style)
  - Dual color system: HSL (backward compat) + OKLCH (modern)
  - `@theme inline` directive for CSS variable exposure
  - Custom dark mode with `@custom-variant dark (&:is(.dark *))`
- **lucide-react**: Icon library for consistent iconography

**Custom Form Components**:

- `FormField`: Generic form field wrapper with validation display
- `CheckboxField`: Checkbox with label and error handling
- `FileInput`: File upload field with validation
- All follow shadcn/ui design patterns with proper accessibility

### Security Patterns

- CSRF protection enabled
- Mass assignment protection via `$fillable`
- File upload validation and sanitization
- Rate limiting on API endpoints
- Input validation via Form Requests

## Coding Standards & Best Practices

### PHP/Laravel Standards

**Code Style**:

- **Laravel Pint** enforces PSR-12 with Laravel conventions
- Run before commit: `./vendor/bin/pint`

**Naming Conventions**:

- **Models**: Singular PascalCase (`Pet`, `User`, `PlacementRequest`)
- **Controllers**: PascalCase + Controller suffix (`PetController`)
- **Services**: PascalCase + Service suffix (`PetManagementService`)
- **Methods**: camelCase (`createPet`, `updateStatus`)

### TypeScript/React Standards

**Code Style**:

- **ESLint + Prettier** with strict TypeScript rules
- Run before commit: `npm run lint && npm run typecheck`

### Documentation Standards

**Code Comments**:

- Explain **why**, not **what**
- Document complex business logic

**API Documentation**:

- OpenAPI annotations on all endpoints
- Keep swagger docs up to date
