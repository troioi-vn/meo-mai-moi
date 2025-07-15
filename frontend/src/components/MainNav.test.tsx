import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'
import MainNav from './MainNav'

describe('MainNav', () => {
  it('renders login and register buttons when not authenticated', () => {
    render(
      <TestAuthProvider mockValues={{ isAuthenticated: false, user: null }}>
        <MemoryRouter>
          <MainNav />
        </MemoryRouter>
      </TestAuthProvider>
    )

    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('renders notification bell and user menu when authenticated', () => {
    render(
      <TestAuthProvider
        mockValues={{
          isAuthenticated: true,
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
        }}
      >
        <MemoryRouter>
          <MainNav />
        </MemoryRouter>
      </TestAuthProvider>
    )

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
  })
})
