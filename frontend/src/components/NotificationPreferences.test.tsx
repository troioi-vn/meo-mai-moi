import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NotificationPreferences } from './NotificationPreferences'
import * as notificationPreferencesApi from '@/api/notification-preferences'

// Mock the API module
vi.mock('@/api/notification-preferences')

const mockGetNotificationPreferences = vi.mocked(notificationPreferencesApi.getNotificationPreferences)
const mockUpdateNotificationPreferences = vi.mocked(notificationPreferencesApi.updateNotificationPreferences)

const mockPreferences = [
  {
    type: 'placement_request_response',
    label: 'Response to Placement Request',
    group: 'helper_profile',
    email_enabled: true,
    in_app_enabled: true,
  },
  {
    type: 'placement_request_accepted',
    label: 'Placement Request Accepted',
    group: 'helper_profile',
    email_enabled: false,
    in_app_enabled: true,
  },
  {
    type: 'helper_response_accepted',
    label: 'Helper Response Accepted',
    group: 'helper_profile',
    email_enabled: true,
    in_app_enabled: false,
  },
  {
    type: 'helper_response_rejected',
    label: 'Helper Response Rejected',
    group: 'helper_profile',
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
    expect(screen.getByText('Control how you receive notifications for different events.')).toBeInTheDocument()
    // Check for skeleton elements by their data-slot attribute instead
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0) // Should have skeleton elements
  })

  it('renders preferences table when data loads successfully', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: mockPreferences })
    
    render(<NotificationPreferences />)
    
    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Placement Request Accepted')).toBeInTheDocument()
    expect(screen.getByText('Helper Response Accepted')).toBeInTheDocument()
    expect(screen.getByText('Helper Response Rejected')).toBeInTheDocument()
    
    // Check table headers
    expect(screen.getByText('Notification Type')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('In-App')).toBeInTheDocument()
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
    mockUpdateNotificationPreferences.mockResolvedValue({ data: null, message: 'Updated successfully' })
    
    render(<NotificationPreferences />)
    
    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })
    
    // Find the email switch for the first preference (should be checked)
    const emailSwitches = screen.getAllByRole('switch')
    const firstEmailSwitch = emailSwitches[0] // First row, email column
    
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
    mockUpdateNotificationPreferences.mockResolvedValue({ data: null, message: 'Updated successfully' })
    
    render(<NotificationPreferences />)
    
    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })
    
    // Find the in-app switch for the first preference (should be checked)
    const switches = screen.getAllByRole('switch')
    const firstInAppSwitch = switches[1] // First row, in-app column
    
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
    mockUpdateNotificationPreferences.mockResolvedValue({ data: null, message: 'Updated successfully' })
    
    render(<NotificationPreferences />)
    
    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })
    
    const emailSwitch = screen.getAllByRole('switch')[0]
    fireEvent.click(emailSwitch)
    
    await waitFor(() => {
      expect(screen.getByText('Notification preferences updated successfully.')).toBeInTheDocument()
    })
  })

  it('calls update API and handles errors', async () => {
    mockGetNotificationPreferences.mockResolvedValue({ data: mockPreferences })
    mockUpdateNotificationPreferences.mockRejectedValue(new Error('Update failed'))
    
    render(<NotificationPreferences />)
    
    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
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
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })
    
    const switches = screen.getAllByRole('switch')
    const emailSwitch = switches[0]
    
    fireEvent.click(emailSwitch)
    
    // All switches should be disabled during update
    switches.forEach(switchElement => {
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