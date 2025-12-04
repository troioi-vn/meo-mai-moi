import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserMenu } from './UserMenu'
import { mockUser } from '@/testing/mocks/data/user'
import { useAuth } from '@/hooks/use-auth'

vi.mock('@/hooks/use-auth')
vi.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    setTheme: vi.fn(),
    theme: 'light',
  }),
}))

// Mock the default avatar import
vi.mock('@/assets/images/default-avatar.webp', () => ({
  default: 'default-avatar.webp',
}))

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('UserMenu', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      register: vi.fn(),
      isLoading: false,
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
      checkEmail: vi.fn(),
    })
  })

  it('renders user avatar with correct fallback initials', () => {
    renderWithRouter(<UserMenu />)

    // Since the avatar image might not load in tests, check for fallback
    const fallback = screen.getByText('TU')
    expect(fallback).toBeInTheDocument()
  })

  it('shows user initials as fallback when avatar fails to load', () => {
    // Mock a user without avatar_url
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, avatar_url: undefined },
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      register: vi.fn(),
      isLoading: false,
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
      checkEmail: vi.fn(),
    })

    renderWithRouter(<UserMenu />)

    const fallback = screen.getByText('TU')
    expect(fallback).toBeInTheDocument()
  })

  it('opens dropdown menu when avatar is clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter(<UserMenu />)

    // Find the dropdown trigger by its aria attributes
    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()

    if (!avatar) {
      throw new Error('Avatar dropdown trigger not found')
    }

    await user.click(avatar)

    // Check that menu items are visible after clicking
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Log Out' })).toBeInTheDocument()
  })

  it('has correct navigation links in the menu', async () => {
    const user = userEvent.setup()
    renderWithRouter(<UserMenu />)

    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()

    if (!avatar) {
      throw new Error('Avatar dropdown trigger not found')
    }

    await user.click(avatar)

    const settingsLink = screen.getByRole('menuitem', { name: 'Settings' })
    const invitationsLink = screen.getByRole('menuitem', { name: 'Invitations' })
    const helperProfilesLink = screen.getByRole('menuitem', { name: 'Helper Profiles' })

    expect(settingsLink).toHaveAttribute('href', '/settings/account')
    expect(invitationsLink).toHaveAttribute('href', '/invitations')
    expect(helperProfilesLink).toHaveAttribute('href', '/helper')
  })

  it('calls logout function when logout is clicked and confirmed', async () => {
    const user = userEvent.setup()
    mockLogout.mockResolvedValue(undefined)

    renderWithRouter(<UserMenu />)

    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()

    if (!avatar) {
      throw new Error('Avatar dropdown trigger not found')
    }

    await user.click(avatar)

    const logoutButton = screen.getByRole('menuitem', { name: 'Log Out' })
    await user.click(logoutButton)

    // Confirmation dialog should appear
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Log out?')).toBeInTheDocument()

    // Click the confirm button in the dialog
    const confirmButton = screen.getByRole('button', { name: 'Log Out' })
    await user.click(confirmButton)

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('does not logout when cancel is clicked in confirmation dialog', async () => {
    const user = userEvent.setup()
    mockLogout.mockResolvedValue(undefined)

    renderWithRouter(<UserMenu />)

    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()

    if (!avatar) {
      throw new Error('Avatar dropdown trigger not found')
    }

    await user.click(avatar)

    const logoutButton = screen.getByRole('menuitem', { name: 'Log Out' })
    await user.click(logoutButton)

    // Confirmation dialog should appear
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    // Click the cancel button
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)

    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('shows theme toggle switch', async () => {
    const user = userEvent.setup()
    renderWithRouter(<UserMenu />)

    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()

    if (!avatar) {
      throw new Error('Avatar dropdown trigger not found')
    }

    await user.click(avatar)

    // Check for dark mode toggle switch
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Toggle dark mode' })).toBeInTheDocument()
  })

  it('handles user without name gracefully', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, name: '' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      register: vi.fn(),
      isLoading: false,
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
      checkEmail: vi.fn(),
    })

    renderWithRouter(<UserMenu />)

    // Should not crash and avatar should still render
    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()
  })

  it('handles logout error gracefully', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Mock console.error for testing
    })
    mockLogout.mockRejectedValue(new Error('Logout failed'))

    renderWithRouter(<UserMenu />)

    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()

    if (!avatar) {
      throw new Error('Avatar dropdown trigger not found')
    }

    await user.click(avatar)

    const logoutButton = screen.getByRole('menuitem', { name: 'Log Out' })
    await user.click(logoutButton)

    // Confirmation dialog should appear
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    // Click the confirm button in the dialog
    const confirmButton = screen.getByRole('button', { name: 'Log Out' })
    await user.click(confirmButton)

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))

    consoleErrorSpy.mockRestore()
    vi.restoreAllMocks()
  })
})
