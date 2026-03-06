import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import SettingsPage from './SettingsPage'
import { renderWithRouter } from '@/testing'
import { usePutUsersMe } from '@/api/generated/user-profile/user-profile'
import type { Mock } from 'vitest'

vi.mock('@/components/notifications/NotificationPreferences', () => ({
  NotificationPreferences: () => (
    <div data-testid="notification-preferences">Notification Preferences Component</div>
  ),
}))

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Language Switcher</div>,
}))

vi.mock('@/api/generated/user-profile/user-profile', () => ({
  usePutUsersMe: vi.fn(),
}))

const mockMutateAsync = vi.fn()

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  email_verified_at: null,
  storage_used_bytes: 0,
  storage_limit_bytes: 50 * 1024 * 1024,
}

function renderSettings(route: string, userOverride?: Partial<typeof mockUser>) {
  const user = { ...mockUser, ...userOverride }

  return renderWithRouter(<SettingsPage />, {
    initialEntries: [route],
    route: '/settings/:tab',
    initialAuthState: { user, isAuthenticated: true, isLoading: false },
  })
}

describe('SettingsPage routing tabs', () => {
  beforeEach(() => {
    ;(usePutUsersMe as unknown as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })
    mockMutateAsync.mockReset()
  })

  it('renders account tab content for /settings/account', () => {
    renderSettings('/settings/account')
    expect(screen.getByRole('button', { name: /password/i })).toBeInTheDocument()
    expect(screen.getByText(mockUser.name)).toBeInTheDocument()
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
    expect(screen.getByText('Storage used')).toBeInTheDocument()
    expect(screen.getByText('Membership')).toBeInTheDocument()
    expect(screen.getByText('Standard')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+5 GB' })).toBeInTheDocument()
    expect(screen.getByText('0 B of 50 MB used')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText(/starting tier is just \$5\/month/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /become a patron/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })

  it('renders notifications tab content for /settings/notifications', () => {
    renderSettings('/settings/notifications')
    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument()
  })

  it('renders contact support for /settings/contact-us', () => {
    renderSettings('/settings/contact-us')
    expect(screen.getByText(/Chat with Support/i)).toBeInTheDocument()
  })
})

describe('SettingsPage name editing', () => {
  beforeEach(() => {
    ;(usePutUsersMe as unknown as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })
    mockMutateAsync.mockReset()
  })

  it('shows edit name button on account tab', () => {
    renderSettings('/settings/account')
    expect(screen.getByRole('button', { name: /edit name/i })).toBeInTheDocument()
  })

  it('clicking edit shows input with current name', async () => {
    const { user } = renderSettings('/settings/account')
    await user.click(screen.getByRole('button', { name: /edit name/i }))

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('Test User')
  })

  it('cancel reverts to display mode', async () => {
    const { user } = renderSettings('/settings/account')
    await user.click(screen.getByRole('button', { name: /edit name/i }))

    expect(screen.getByRole('textbox')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('submitting new name calls the API', async () => {
    mockMutateAsync.mockResolvedValue({})
    const { user } = renderSettings('/settings/account')

    await user.click(screen.getByRole('button', { name: /edit name/i }))

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Name')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: { name: 'New Name', email: 'test@example.com' },
      })
    })
  })

  it('shows "Email not set" for Telegram placeholder email and allows setting email', () => {
    renderSettings('/settings/account', {
      email: 'telegram_5612904335@telegram.meo-mai-moi.local',
      email_verified_at: '2025-01-01T00:00:00Z',
    })

    expect(screen.getByText('Email not set')).toBeInTheDocument()
    expect(
      screen.queryByText('telegram_5612904335@telegram.meo-mai-moi.local')
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set your email/i })).toBeInTheDocument()
  })

  it('hides email edit controls for verified non-Telegram email', () => {
    renderSettings('/settings/account', {
      email: 'verified@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
    })

    expect(screen.queryByRole('button', { name: /edit email/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /set your email/i })).not.toBeInTheDocument()
  })

  it('asks for confirmation before setting email from Telegram placeholder account', async () => {
    mockMutateAsync.mockResolvedValue({})
    const { user } = renderSettings('/settings/account', {
      email: 'telegram_5612904335@telegram.meo-mai-moi.local',
      email_verified_at: '2025-01-01T00:00:00Z',
    })

    await user.click(screen.getByRole('button', { name: /set your email/i }))

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'real.user@example.com')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(mockMutateAsync).not.toHaveBeenCalled()
    expect(screen.getByText(/set your email address\?/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /set email and continue/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: { name: 'Test User', email: 'real.user@example.com' },
      })
    })
  })

  it('formats and displays storage usage value', () => {
    renderSettings('/settings/account', {
      storage_used_bytes: 1536,
      storage_limit_bytes: 1024 * 1024,
    })

    expect(screen.getByText('1.5 KB of 1.0 MB used')).toBeInTheDocument()
  })

  it('shows premium status and hides patron cta for premium users', () => {
    renderSettings('/settings/account', {
      is_premium: true,
    })

    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+5 GB' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /become a patron/i })).not.toBeInTheDocument()
  })

  it('opens patron dialog from +5 GB button for non-premium users', async () => {
    const { user } = renderSettings('/settings/account')

    await user.click(screen.getByRole('button', { name: '+5 GB' }))

    expect(screen.getByText('Unlock 5 GB storage')).toBeInTheDocument()
    expect(screen.getByText(/starting tier is just \$5\/month/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /become a patron/i })).toHaveAttribute(
      'href',
      'https://www.patreon.com/catarchy'
    )
  })
})
