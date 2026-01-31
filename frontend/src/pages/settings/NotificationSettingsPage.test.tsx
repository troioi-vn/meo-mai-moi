import { renderWithRouter, testQueryClient } from '@/testing'
import { screen } from '@testing-library/react'
import NotificationSettingsPage from './NotificationSettingsPage'
import { vi } from 'vitest'

// Mock the NotificationPreferences component
vi.mock('@/components/notifications/NotificationPreferences', () => ({
  NotificationPreferences: () => (
    <div data-testid="notification-preferences">Notification Preferences Component</div>
  ),
}))

const renderWithProviders = (component: React.ReactElement) => {
  testQueryClient.clear()
  return renderWithRouter(component)
}

describe('NotificationSettingsPage', () => {
  it('renders the page title and description', () => {
    renderWithProviders(<NotificationSettingsPage />)

    expect(screen.getByRole('heading', { name: /notification settings/i })).toBeInTheDocument()
    expect(screen.getByText(/manage how you receive notifications/i)).toBeInTheDocument()
  })

  it('renders breadcrumbs navigation', () => {
    renderWithProviders(<NotificationSettingsPage />)

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    const settingsLinks = screen.getAllByRole('link', { name: /settings/i })
    expect(settingsLinks.length).toBeGreaterThan(0)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('renders back to settings button', () => {
    renderWithProviders(<NotificationSettingsPage />)

    const backButton = screen.getByRole('link', { name: /back to settings/i })
    expect(backButton).toBeInTheDocument()
    expect(backButton).toHaveAttribute('href', '/settings/account')
  })

  it('renders the NotificationPreferences component', () => {
    renderWithProviders(<NotificationSettingsPage />)

    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument()
  })

  it('has correct breadcrumb links', () => {
    renderWithProviders(<NotificationSettingsPage />)

    const settingsLinks = screen.getAllByRole('link', { name: /settings/i })
    // Check that at least one of the account links has the correct href
    const breadcrumbSettingsLink = settingsLinks.find(
      (link) => link.getAttribute('href') === '/settings/account' && link.textContent === 'Settings'
    )
    expect(breadcrumbSettingsLink).toBeInTheDocument()
  })
})
