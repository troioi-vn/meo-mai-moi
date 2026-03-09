import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter } from '@/testing'
import { UserMenu } from './UserMenu'
import { mockUser } from '@/testing/mocks/data/user'
import { useAuth } from '@/hooks/use-auth'

vi.mock('@/hooks/use-auth')
const mockSetTheme = vi.fn()
const mockThemeState = {
  setTheme: mockSetTheme,
  theme: 'light' as const,
  resolvedTheme: 'light' as const,
}

vi.mock('@/hooks/use-theme', () => ({
  useTheme: () => mockThemeState,
}))

// Mock the default avatar import
vi.mock('@/assets/images/default-avatar.webp', () => ({
  default: 'default-avatar.webp',
}))

describe('UserMenu', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockThemeState.theme = 'light'
    mockThemeState.resolvedTheme = 'light'
    ;(window as Window & { __deferredInstallPrompt?: Event | null }).__deferredInstallPrompt = null
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

  it('renders complex emoji initials correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, name: '👨‍👩‍👧‍👦 Smith', avatar_url: undefined },
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

    expect(screen.getByText('👨‍👩‍👧‍👦S')).toBeInTheDocument()
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

    expect(document.querySelector('a[href="/settings/account"]')).toBeInTheDocument()
    expect(document.querySelector('[role="menuitem"]:not([href])')).toBeInTheDocument()
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

    const settingsLink = document.querySelector('a[href="/settings/account"]')
    const developerLink = document.querySelector('a[href="/developer"]')
    const invitationsLink = document.querySelector('a[href="/invitations"]')
    const helperProfilesLink = document.querySelector('a[href="/helper"]')

    expect(settingsLink).toHaveAttribute('href', '/settings/account')
    expect(developerLink).toHaveAttribute('href', '/developer')
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

    const logoutButton = document.querySelector('[role="menuitem"]:not([href])')
    expect(logoutButton).toBeInTheDocument()
    await user.click(logoutButton)

    // Confirmation dialog should appear
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    // Click the confirm button in the dialog
    const confirmButton = document.querySelector('[data-slot="alert-dialog-action"]')
    expect(confirmButton).toBeInTheDocument()
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

    const logoutButton = document.querySelector('[role="menuitem"]:not([href])')
    expect(logoutButton).toBeInTheDocument()
    await user.click(logoutButton)

    // Confirmation dialog should appear
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    // Click the cancel button
    const cancelButton = document.querySelector('[data-slot="alert-dialog-cancel"]')
    expect(cancelButton).toBeInTheDocument()
    await user.click(cancelButton)

    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('shows theme toggle switch and updates the saved theme', async () => {
    const user = userEvent.setup()
    mockThemeState.theme = 'system'
    mockThemeState.resolvedTheme = 'dark'
    renderWithRouter(<UserMenu />)

    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()

    if (!avatar) {
      throw new Error('Avatar dropdown trigger not found')
    }

    await user.click(avatar)

    const themeSwitch = screen.getByRole('switch')
    expect(themeSwitch).toBeInTheDocument()
    expect(themeSwitch).toHaveAttribute('data-state', 'checked')

    await user.click(themeSwitch)

    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('shows Add to Desktop when deferred prompt exists before menu mount (no theme toggle)', async () => {
    const user = userEvent.setup()

    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      maxTouchPoints: 5,
    })
    vi.stubGlobal('innerWidth', 375)

    const deferredPrompt = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }

    ;(window as Window & { __deferredInstallPrompt?: Event | null }).__deferredInstallPrompt =
      deferredPrompt

    renderWithRouter(<UserMenu />)

    const avatar = document.querySelector('[aria-haspopup="menu"]')
    expect(avatar).toBeInTheDocument()

    if (!avatar) {
      throw new Error('Avatar dropdown trigger not found')
    }

    await user.click(avatar)

    expect(screen.getByText('Add to Desktop')).toBeInTheDocument()

    vi.unstubAllGlobals()
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

  it('shows premium badge when user has premium role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, roles: ['premium'] },
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

    expect(screen.getByLabelText(/premium user/i)).toBeInTheDocument()
  })

  it('does not show premium badge for non-premium user', () => {
    renderWithRouter(<UserMenu />)

    expect(screen.queryByLabelText(/premium user/i)).not.toBeInTheDocument()
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

    const logoutButton = document.querySelector('[role="menuitem"]:not([href])')
    expect(logoutButton).toBeInTheDocument()
    await user.click(logoutButton)

    // Confirmation dialog should appear
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    // Click the confirm button in the dialog
    const confirmButton = document.querySelector('[data-slot="alert-dialog-action"]')
    expect(confirmButton).toBeInTheDocument()
    await user.click(confirmButton)

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))

    consoleErrorSpy.mockRestore()
    vi.restoreAllMocks()
  })
})
