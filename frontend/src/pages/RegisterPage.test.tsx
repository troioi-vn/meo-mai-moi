import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'
import RegisterPage from '../pages/RegisterPage'

import type { RenderOptions } from '@testing-library/react'
import type { AuthContextType } from '@/types/auth'

const renderWithProviders = (
  ui: React.ReactElement,
  {
    providerProps,
    ...renderOptions
  }: { providerProps?: Partial<AuthContextType>; [key: string]: RenderOptions }
) => {
  return render(
    <TestAuthProvider {...providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  )
}

describe('RegisterPage', () => {
  it('renders the register page correctly', () => {
    renderWithProviders(<RegisterPage />, { providerProps: {} })

    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })
})
