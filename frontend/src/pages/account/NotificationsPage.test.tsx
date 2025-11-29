import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotificationsPage from './NotificationsPage'
import { vi } from 'vitest'

// Mock the NotificationPreferences component
vi.mock('@/components/notifications/NotificationPreferences', () => ({
  NotificationPreferences: () => (
    <div data-testid="notification-preferences">Notification Preferences Component</div>
  ),
}))

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('NotificationsPage', () => {
  it('renders the page title and description', () => {
    renderWithProviders(<NotificationsPage />)

    expect(screen.getByRole('heading', { name: /notification settings/i })).toBeInTheDocument()
    expect(screen.getByText(/manage how you receive notifications/i)).toBeInTheDocument()
  })

  it('renders breadcrumbs navigation', () => {
    renderWithProviders(<NotificationsPage />)

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    const settingsLinks = screen.getAllByRole('link', { name: /settings/i })
    expect(settingsLinks.length).toBeGreaterThan(0)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('renders back to settings button', () => {
    renderWithProviders(<NotificationsPage />)

    const backButton = screen.getByRole('link', { name: /back to settings/i })
    expect(backButton).toBeInTheDocument()
    expect(backButton).toHaveAttribute('href', '/settings/account')
  })

  it('renders the NotificationPreferences component', () => {
    renderWithProviders(<NotificationsPage />)

    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument()
  })

  it('has correct breadcrumb links', () => {
    renderWithProviders(<NotificationsPage />)

    const settingsLinks = screen.getAllByRole('link', { name: /settings/i })
    // Check that at least one of the account links has the correct href
    const breadcrumbSettingsLink = settingsLinks.find(
      (link) => link.getAttribute('href') === '/settings/account' && link.textContent === 'Settings'
    )
    expect(breadcrumbSettingsLink).toBeInTheDocument()
  })
})
