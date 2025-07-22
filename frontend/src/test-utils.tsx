import type { ReactElement } from 'react'
import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AllTheProviders, testQueryClient } from '@/components/test/AllTheProviders'

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

const renderWithRouter = (
  ui: ReactElement,
  {
    route = '/',
    initialAuthState = { user: null, isLoading: false, isAuthenticated: false },
    ...renderOptions
  }: {
    route?: string
    initialAuthState?: { user: any; isLoading: boolean; isAuthenticated: boolean }
  } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  const history = {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }

  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <AllTheProviders initialAuthState={initialAuthState}>{ui}</AllTheProviders>
    </MemoryRouter>,
    renderOptions
  )

  return {
    ...utils,
    history,
    user: userEvent.setup(),
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'
export { customRender as render, renderWithRouter, userEvent, testQueryClient }
