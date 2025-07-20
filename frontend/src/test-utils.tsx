import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
})

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuthSate?: {
    isAuthenticated: boolean
    user: import('@/types/user').User | null
    token: string | null
  }
  memoryRouterProps?: MemoryRouterProps
}

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

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
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>
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
