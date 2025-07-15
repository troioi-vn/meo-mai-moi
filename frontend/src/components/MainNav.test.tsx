import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MainNav from './MainNav'
import { useAuth } from '@/hooks/use-auth'

vi.mock('@/hooks/use-auth')
vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Notification Bell</div>,
}))
vi.mock('./UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu">User Menu</div>,
}))

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('MainNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        isLoading: false,
        loadUser: vi.fn(),
        changePassword: vi.fn(),
        deleteAccount: vi.fn(),
      })
    })

    it('renders the brand logo', () => {
      renderWithRouter(<MainNav />)

      const logo = screen.getByRole('link', { name: 'Meo!' })
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('href', '/')
    })

    it('shows login and register buttons', () => {
      renderWithRouter(<MainNav />)

      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
    })

    it('does not show authenticated user components', () => {
      renderWithRouter(<MainNav />)

      expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument()
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument()
    })

    it('has correct navigation links', () => {
      renderWithRouter(<MainNav />)

      const loginLink = screen.getByRole('link', { name: /login/i })
      const registerLink = screen.getByRole('link', { name: /register/i })

      expect(loginLink).toHaveAttribute('href', '/login')
      expect(registerLink).toHaveAttribute('href', '/register')
    })
  })

  describe('when user is authenticated', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        isLoading: false,
        loadUser: vi.fn(),
        changePassword: vi.fn(),
        deleteAccount: vi.fn(),
      })
    })

    it('renders the brand logo', () => {
      renderWithRouter(<MainNav />)

      const logo = screen.getByRole('link', { name: 'Meo!' })
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('href', '/')
    })

    it('shows notification bell and user menu', () => {
      renderWithRouter(<MainNav />)

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
      expect(screen.getByTestId('user-menu')).toBeInTheDocument()
    })

    it('does not show login and register buttons', () => {
      renderWithRouter(<MainNav />)

      expect(screen.queryByRole('link', { name: /login/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument()
    })
  })

  it('has proper navigation structure', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false,
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderWithRouter(<MainNav />)

    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()

    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('fixed', 'top-0', 'z-50')
  })

  it('applies proper styling classes for fixed navigation', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false,
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderWithRouter(<MainNav />)

    const header = screen.getByRole('banner')
    expect(header).toHaveClass(
      'fixed',
      'top-0',
      'left-0',
      'right-0',
      'z-50',
      'bg-background/95',
      'backdrop-blur'
    )
  })
})
