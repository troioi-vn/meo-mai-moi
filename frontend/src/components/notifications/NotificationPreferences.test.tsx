import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NotificationPreferences } from './NotificationPreferences'
import * as notificationPreferencesApi from '@/api/notification-preferences'
import { toast } from 'sonner'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the API module
vi.mock('@/api/notification-preferences')

const mockGetNotificationPreferences = vi.mocked(
  notificationPreferencesApi.getNotificationPreferences
)
const mockUpdateNotificationPreferences = vi.mocked(
  notificationPreferencesApi.updateNotificationPreferences
)

const mockPreferences = [
  {
    type: 'placement_request_response',
    label: 'New response to your request',
    description: 'When someone responds to your placement request',
    group: 'placement_owner',
    group_label: 'Your Placement Requests',
    email_enabled: true,
    in_app_enabled: true,
  },
  {
    type: 'helper_response_accepted',
    label: 'Your response was accepted',
    description: 'When a pet owner accepts your response',
    group: 'placement_helper',
    group_label: 'Your Responses to Placements',
    email_enabled: false,
    in_app_enabled: true,
  },
  {
    type: 'helper_response_rejected',
    label: 'Your response was declined',
    description: 'When a pet owner declines your response',
    group: 'placement_helper',
    group_label: 'Your Responses to Placements',
    email_enabled: true,
    in_app_enabled: false,
  },
  {
    type: 'vaccination_reminder',
    label: 'Vaccination due soon',
    description: 'Reminders when vaccinations are due',
    group: 'pet_reminders',
    group_label: 'Pet Reminders',
    email_enabled: false,
    in_app_enabled: false,
  },
]

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockGetNotificationPreferences.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<NotificationPreferences />)

    expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
    expect(
      screen.getByText('Control how you receive notifications for different events.')
    ).toBeInTheDocument()
    // Check for skeleton elements by their data-slot attribute instead
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0) // Should have skeleton elements
  })

  it('renders preferences in grouped cards when data loads successfully', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: mockPreferences })

    render(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('New response to your request')).toBeInTheDocument()
    })

    expect(screen.getByText('Your response was accepted')).toBeInTheDocument()
    expect(screen.getByText('Your response was declined')).toBeInTheDocument()
    expect(screen.getByText('Vaccination due soon')).toBeInTheDocument()

    // Check group headers
    expect(screen.getByText('Your Placement Requests')).toBeInTheDocument()
    expect(screen.getByText('Your Responses to Placements')).toBeInTheDocument()
    expect(screen.getByText('Pet Reminders')).toBeInTheDocument()

    // Check descriptions
    expect(screen.getByText('When someone responds to your placement request')).toBeInTheDocument()
    expect(screen.getByText('When a pet owner accepts your response')).toBeInTheDocument()
  })

  it('renders error state when loading fails', async () => {
    const errorMessage = 'Failed to load preferences'
    mockGetNotificationPreferences.mockRejectedValue(new Error(errorMessage))

    render(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('toggles email preference when switch is clicked', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: mockPreferences })
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    render(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('New response to your request')).toBeInTheDocument()
    })

    // Find all switches - they come in pairs (email, in-app) for each preference
    const switches = screen.getAllByRole('switch')
    const firstEmailSwitch = switches[0] // First preference, email switch

    expect(firstEmailSwitch).toBeChecked()

    // Click to toggle
    fireEvent.click(firstEmailSwitch)

    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith([
        {
          type: 'placement_request_response',
          email_enabled: false,
          in_app_enabled: true,
        },
      ])
    })
  })

  it('toggles in-app preference when switch is clicked', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: mockPreferences })
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    render(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('New response to your request')).toBeInTheDocument()
    })

    // Find all switches - they come in pairs (email, in-app) for each preference
    const switches = screen.getAllByRole('switch')
    const firstInAppSwitch = switches[1] // First preference, in-app switch

    expect(firstInAppSwitch).toBeChecked()

    // Click to toggle
    fireEvent.click(firstInAppSwitch)

    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith([
        {
          type: 'placement_request_response',
          email_enabled: true,
          in_app_enabled: false,
        },
      ])
    })
  })

  it('shows success message after successful update', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: mockPreferences })
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    render(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('New response to your request')).toBeInTheDocument()
    })

    const emailSwitch = screen.getAllByRole('switch')[0]
    fireEvent.click(emailSwitch)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Settings saved')
    })
  })

  it('calls update API and handles errors', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: mockPreferences })
    mockUpdateNotificationPreferences.mockRejectedValue(new Error('Update failed'))

    render(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('New response to your request')).toBeInTheDocument()
    })

    const emailSwitch = screen.getAllByRole('switch')[0]
    expect(emailSwitch).toBeChecked()

    // Click to toggle
    fireEvent.click(emailSwitch)

    // Should call the update API
    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith([
        {
          type: 'placement_request_response',
          email_enabled: false,
          in_app_enabled: true,
        },
      ])
    })
  })

  it('disables switches while updating', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: mockPreferences })
    mockUpdateNotificationPreferences.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('New response to your request')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    const emailSwitch = switches[0]

    fireEvent.click(emailSwitch)

    // All switches should be disabled during update
    switches.forEach((switchElement) => {
      expect(switchElement).toBeDisabled()
    })
  })

  it('renders empty state when no preferences are available', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: [] })

    render(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('No notification types available.')).toBeInTheDocument()
    })
  })
})
