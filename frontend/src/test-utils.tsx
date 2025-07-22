import type { ReactElement } from 'react'
import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AllTheProviders } from '@/components/test/AllTheProviders'
import { testQueryClient } from '@/test-query-client'

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

import type { User } from '@/types/user'

const renderWithRouter = (
  ui: ReactElement,
  {
    route = '/',
    initialAuthState = { user: null, isLoading: false, isAuthenticated: false },
    ...renderOptions
  }: {
    route?: string
    initialAuthState?: { user: User | null; isLoading: boolean; isAuthenticated: boolean }
  } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <AllTheProviders initialAuthState={initialAuthState}>{ui}</AllTheProviders>
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
