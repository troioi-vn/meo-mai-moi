import type { ReactElement } from 'react'
import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AllTheProviders } from './providers'
import { testQueryClient } from './query-client'

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

import type { User } from '@/types/user'

interface RouteDef {
  path: string
  element: React.ReactElement
}

const renderWithRouter = (
  ui: ReactElement,
  options: {
    route?: string
    initialEntries?: string[]
    routes?: RouteDef[]
    initialAuthState?: { user: User | null; isLoading: boolean; isAuthenticated: boolean }
  } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  const {
    route = '/',
    initialEntries,
    routes,
    initialAuthState = { user: null, isLoading: false, isAuthenticated: false },
    ...renderOptions
  } = options

  const entries = initialEntries ?? [route]

  const utils = render(
    <MemoryRouter initialEntries={entries}>
      <AllTheProviders initialAuthState={initialAuthState}>
        <Routes>
          {/* If custom routes provided, use them and add the UI as the component for matching route patterns */}
          {routes && routes.length > 0 ? (
            <>
              {routes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
              {/* Fallback catch-all for any non-matching routes */}
              <Route path="*" element={ui} />
            </>
          ) : (
            /* Default: render the UI at any route */
            <Route path="*" element={ui} />
          )}
        </Routes>
      </AllTheProviders>
    </MemoryRouter>,
    renderOptions
  )

  return {
    ...utils,
    user: userEvent.setup(),
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'
export { customRender as render, renderWithRouter, userEvent, testQueryClient }
