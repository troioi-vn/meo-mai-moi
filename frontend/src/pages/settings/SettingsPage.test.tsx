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
}

function renderSettings(route: string) {
  return renderWithRouter(<SettingsPage />, {
    initialEntries: [route],
    route: '/settings/:tab',
    initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
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
})
