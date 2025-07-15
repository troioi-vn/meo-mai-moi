import { render, screen, RenderOptions } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'
import LoginPage from '../pages/LoginPage'
import { AuthContextType } from '@/types/auth'

const renderWithProviders = (
  ui: React.ReactElement,
  {
    providerProps,
    ...renderOptions
  }: { providerProps?: Partial<AuthContextType> } & RenderOptions = {},
) => {
  return render(
    <TestAuthProvider mockValues={providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions,
  )
}

describe('LoginPage', () => {
  it('renders the login page correctly', () => {
    renderWithProviders(<LoginPage />, { providerProps: {} })

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })
})
