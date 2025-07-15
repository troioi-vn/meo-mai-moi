import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'
import ProfilePage from '../pages/ProfilePage'

import { RenderOptions } from '@testing-library/react'
import { AuthContextType } from '@/contexts/auth-context'

const renderWithProviders = (
  ui: React.ReactElement,
  { providerProps, ...renderOptions }: { providerProps?: Partial<AuthContextType>; [key: string]: RenderOptions }
) => {
  return render(
    <TestAuthProvider {...providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  )
}

describe('ProfilePage', () => {
  it('renders the profile page correctly', () => {
    const user = { name: 'Test User', email: 'test@example.com' }
    const logout = vi.fn()
    renderWithProviders(<ProfilePage />, { providerProps: { mockValues: { user, logout } } })

    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByText('Name:')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Email:')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})
