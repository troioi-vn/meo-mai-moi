import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import SettingsPage from './SettingsPage'
import { renderWithRouter } from '@/testing'

vi.mock('@/components/notifications/NotificationPreferences', () => ({
  NotificationPreferences: () => (
    <div data-testid="notification-preferences">Notification Preferences Component</div>
  ),
}))

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
