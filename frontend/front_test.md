
# Frontend Testing Strategy & Progress (as of July 2025)

The frontend test suite is now robust, comprehensive, and fully aligned with modern best practices. All tests use **Vitest** as the runner, **React Testing Library** for component interaction, and **Mock Service Worker (MSW)** for API mocking. The architecture ensures consistency, realism, and maintainability across all tests.


## Key Principles

1. **Shared Test Utility**: All tests use the `renderWithRouter` function from `frontend/src/test-utils.tsx`, which wraps components in all required providers (`QueryClientProvider`, `MemoryRouter`, `AuthProvider`, `Toaster`).
2. **Centralized Mock Data**: All mock data (e.g., for `Cat`, `User`) is defined in `frontend/src/mocks/data/` and imported into tests, eliminating duplication and ensuring consistency.
3. **Global MSW Server**: No test file sets up its own MSW server. The global server is configured in `frontend/src/setupTests.ts` and uses modular handlers from `frontend/src/mocks/handlers.ts`.
4. **User-Centric Assertions**: All tests assert against rendered output and user-visible behavior, not implementation details.
5. **API Response Shape Consistency**: All MSW handlers and mocks return data in the exact structure as the real API (e.g., `{ data: ... }`), and all endpoints use absolute URLs for reliability in jsdom.


## Testing Architecture & Recent Progress

- **TanStack Query Integration**: All components using `useQuery`/`useMutation` are tested within a `QueryClientProvider` via `renderWithRouter`. Query cache is cleared before each test for isolation.
- **MSW Handlers**: All handlers use absolute URLs and return data in the real API's structure. Handlers and mock data are modular and grouped by resource. The main `handlers.ts` composes all handlers for the global server.
- **API Response Shape**: All mocks and handlers return `{ data: ... }` or `{ data: { notifications, unread_count } }` as required. Cat-related endpoints and tests now use `/cats` (not `/my-cats`).
- **Test Refactor**: All frontend test files have been refactored to use the global MSW server, `renderWithRouter`, and centralized mock data. Local MSW setups and decentralized mock data have been removed. Obsolete test planning files have been deleted.


## Example: Testing a Component that Fetches Data

```tsx
import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import { mockCat } from '@/mocks/data/cats'
import CatProfilePage from './CatProfilePage'

describe('CatProfilePage', () => {
  it('renders cat profile information correctly', async () => {
    renderWithRouter(<CatProfilePage />, { route: `/cats/${mockCat.id}` })
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(mockCat.name)).toBeInTheDocument()
    })
  })
})
```


## Current Test Coverage & Achievements

- **All major components and pages are fully tested.**
- **CatProfilePage, CatCard, CatPhotoManager, MyCatsPage, EnhancedCatRemovalModal, and App routing** have comprehensive tests covering all user flows, error states, and permission scenarios.
- **NotificationBell** and all notification-related logic are tested with correct API shapes and unread count handling.
- **All tests use centralized mock data and global MSW handlers.**
- **Critical bugs** (e.g., admin permission enum bug, route 404s) were discovered and fixed through testing.
- **Test patterns** for user-centric assertions, permission testing, and API mocking are established for future development.

## Running Tests

```bash
cd frontend && npm test
# Or run a specific test file:
npm test -- CatProfilePage.test.tsx
npm test -- App.routing.test.tsx
```

## Next Steps

- Expand integration and E2E tests for full user journeys
- Maintain strict adherence to the shared test utility and mock data patterns
- Keep all new features covered by user-centric, MSW-powered tests

