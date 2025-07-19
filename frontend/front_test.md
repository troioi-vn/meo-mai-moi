# Frontend Testing Strategy

The frontend test suite uses **Vitest** for running tests, **React Testing Library** for rendering and interacting with components, and **Mock Service Worker (MSW)** for mocking API requests. The new testing architecture is built on a foundation of consistency and realism, ensuring that components are tested in an environment that closely mirrors the actual application.

## Key Principles

1.  **Always Use the Shared Test Utility**: All tests must use the `renderWithRouter` function from `frontend/src/test-utils.tsx`. This utility wraps components in all necessary providers (`QueryClientProvider`, `MemoryRouter`, `AuthProvider`, `Toaster`), ensuring a consistent and realistic test environment.
2.  **Use Centralized Mock Data**: All mock data, especially for primary models like `Cat`, should be defined in and imported from `frontend/src/mocks/data/`. This prevents data duplication and ensures that tests are consistent.
3.  **Rely on the Global Mock Server**: Individual test files must **not** set up their own MSW server. The global server is configured in `frontend/src/setupTests.ts` and uses a modular handler system.
4.  **Write User-Centric Tests**: Tests should focus on what the user sees and does. Assert against the rendered output (e.g., `screen.getByText('Fluffy')`) rather than component state or implementation details.

## Testing Architecture with TanStack Query and MSW

-   **TanStack Query Integration (`@tanstack/react-query`)**:
    -   **Problem**: Components that use hooks like `useQuery` or `useMutation` require a `QueryClientProvider` to be present in the component tree.
    -   **Solution**: A single `QueryClient` instance is provided to all test components via our custom `renderWithRouter` function. The query cache is cleared before each test to ensure test isolation.

-   **Modular MSW Handlers (`handlers.ts`)**:
    -   **Problem**: Mock handlers were previously scattered, inconsistent, and did not correctly handle URL resolution in the `jsdom` test environment, leading to network errors.
    -   **Solution**: The new architecture uses a centralized and modular approach:
        1.  **Absolute URLs**: All MSW handlers **must** use absolute URLs (e.g., `http://localhost:3000/api/cats`) to ensure they are correctly intercepted by the mock server.
        2.  **Data-Centric Modules**: Mock data and its corresponding handlers are grouped by resource (e.g., `frontend/src/mocks/data/cats.ts`).
        3.  **Central Handler Composition**: The main `frontend/src/mocks/handlers.ts` file imports and combines these modular handlers into a single `handlers` array for the global server.
        4.  **Correct API Structure**: All mock handlers are configured to return data in the same structure as the real API (e.g., wrapping responses in a `{ "data": ... }` object).

## Example: Testing a Component that Fetches Data

```tsx
// In your test file:
import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from '@/test-utils' // Import the shared utility
import { mockCat } from '@/mocks/data/cats' // Import the shared mock data
import CatProfilePage from './CatProfilePage'

describe('CatProfilePage', () => {
  it('renders cat profile information correctly', async () => {
    // Use the utility to render the component with a specific route
    renderWithRouter(<CatProfilePage />, { route: `/cats/${mockCat.id}` })

    // Assert that the loading state appears first
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Wait for the data to be fetched and rendered
    await waitFor(() => {
      // Assert against the content using the centralized mock data
      expect(screen.getByText(mockCat.name)).toBeInTheDocument()
    })
  })
})
```

## Additional Notes

- **Testing:** Components should include comprehensive test files using Vitest + RTL.
- **State Management:** React Context for global state (auth), local state with hooks for component-specific state.
- **Form Handling:** Validation uses error handling patterns with `AxiosError` type checking. Error display uses consistent error message patterns and toast notifications.
- **API Integration:** Standardized error handling with fallback messages for network issues.

