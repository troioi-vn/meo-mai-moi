---
inclusion: always
---

# Architecture Patterns & Conventions

## Backend Architecture (Laravel)

### Layer Structure (Enforced by Deptrac)
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

### Database Conventions
- **PostgreSQL only** - SQLite not supported
- Enum classes for status fields (e.g., `PetStatus::ACTIVE`)
- Foreign key constraints enforced
- Seeders required for tests (especially `PetTypeSeeder`)

### File Organization
- **Uploads**: `storage/app/public` (symlinked to `public/storage`)
- **Logs**: `storage/logs`
- **Cache**: Redis in production, file in development

## Frontend Architecture (React + TypeScript)

### Component Structure
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

### State Management
- **React Query** for server state
- **React Hook Form** for form state
- **AuthProvider** for authentication context
- Local state with `useState` for UI state

### API Integration
- Axios with cookie-based session auth
- OpenAPI-generated types (when available)
- MSW for test mocking with absolute URLs
- Mirror `{ data: ... }` API response shape

## Testing Patterns

### Backend Testing
- **Pest/PHPUnit** with `RefreshDatabase`
- Seed dependencies in tests to avoid FK errors
- Use factories for test data creation
- Policy tests with proper role setup

### Frontend Testing
- **Vitest + React Testing Library**
- MSW for API mocking in tests
- Test user interactions, not implementation details
- Mock `sonner` toasts in `setupTests.ts`

## Security Patterns
- CSRF protection enabled
- Mass assignment protection via `$fillable`
- File upload validation and sanitization
- Rate limiting on API endpoints
- Input validation via Form Requests