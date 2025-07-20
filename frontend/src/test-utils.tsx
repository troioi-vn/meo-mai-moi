import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom'
import { AllTheProviders, testQueryClient } from '@/components/test/AllTheProviders'


const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

const renderWithRouter = (
  ui: ReactElement,
  { route = '/', ...renderOptions }: { route?: string } & Omit<RenderOptions, 'wrapper'> = {},
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
      <AllTheProviders>{ui}</AllTheProviders>
    </MemoryRouter>,
    renderOptions,
  )

  return {
    ...utils,
    history,
    user: userEvent.setup(),
  }
}

export * from '@testing-library/react'
export { customRender as render, renderWithRouter, userEvent, testQueryClient }
