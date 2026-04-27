import { renderWithRouter, testQueryClient } from '@/testing'
import { screen } from '@testing-library/react'
import NotificationSettingsPage from './NotificationSettingsPage'
import { vi } from 'vite-plus/test'

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

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(document.querySelector('h1 + p')).toBeInTheDocument()
  })

  it('renders breadcrumbs navigation', () => {
    renderWithProviders(<NotificationSettingsPage />)

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    const settingsLinks = Array.from(document.querySelectorAll('a[href="/settings/account"]'))
    expect(settingsLinks.length).toBeGreaterThan(0)
  })

  it('renders back to settings button', () => {
    renderWithProviders(<NotificationSettingsPage />)

    const backButton = document.querySelector('a[href="/settings/account"]')
    expect(backButton).toBeInTheDocument()
    expect(backButton).toHaveAttribute('href', '/settings/account')
  })

  it('renders the NotificationPreferences component', () => {
    renderWithProviders(<NotificationSettingsPage />)

    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument()
  })

  it('has correct breadcrumb links', () => {
    renderWithProviders(<NotificationSettingsPage />)

    const settingsLinks = Array.from(document.querySelectorAll('nav a[href="/settings/account"]'))
    const breadcrumbSettingsLink = settingsLinks.at(0)
    expect(breadcrumbSettingsLink).toBeInTheDocument()
  })
})
