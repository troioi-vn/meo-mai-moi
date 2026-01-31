import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderWithRouter, testQueryClient } from '@/testing'
import { NotificationPreferences } from './NotificationPreferences'
import * as notificationPreferencesApi from '@/api/generated/notification-preferences/notification-preferences'
import { toast } from 'sonner'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the API module
vi.mock('@/api/generated/notification-preferences/notification-preferences')

const mockGetNotificationPreferences = vi.mocked(
  notificationPreferencesApi.getNotificationPreferences
)
const mockUpdateNotificationPreferences = vi.mocked(
  notificationPreferencesApi.putNotificationPreferences
)

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

describe('NotificationPreferences Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testQueryClient.clear()
  })

  it('handles complete user workflow of loading and updating preferences', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    renderWithRouter(<NotificationPreferences />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })

    // Verify all preferences are displayed
    expect(screen.getByText('Placement Request Accepted')).toBeInTheDocument()
    expect(screen.getByText('Helper Response Accepted')).toBeInTheDocument()
    expect(screen.getByText('Helper Response Rejected')).toBeInTheDocument()

    // Get all switches
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(8) // 4 preferences × 2 switches each

    // Verify initial states match mock data
    expect(switches[0]).toBeChecked() // placement_request_response email
    expect(switches[1]).toBeChecked() // placement_request_response in_app
    expect(switches[2]).not.toBeChecked() // placement_request_accepted email
    expect(switches[3]).toBeChecked() // placement_request_accepted in_app

    // Toggle the first email preference
    fireEvent.click(switches[0])

    // Verify API was called with correct data
    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({
        preferences: [
          {
            type: 'placement_request_response',
            email_enabled: false,
            in_app_enabled: true,
          },
        ],
      })
    })

    // Verify success message appears
    expect(toast.success).toHaveBeenCalledWith('Notification preferences saved', undefined)
  })

  it('handles multiple rapid preference changes correctly', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')

    // Rapidly toggle multiple switches
    fireEvent.click(switches[0]) // First email switch
    fireEvent.click(switches[1]) // First in-app switch
    fireEvent.click(switches[2]) // Second email switch

    // Should debounce and only make the final API call
    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledTimes(1)
    })
  })

  it('handles API errors gracefully and shows error messages', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockRejectedValue(new Error('Network error'))

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    await fireEvent.click(switches[0])

    await waitFor(
      async () => {
        expect(await screen.findByTestId('error-alert')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('maintains UI state consistency during updates', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)

    // Mock a slow API response
    let resolveUpdate: (value: any) => void
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve
    })
    mockUpdateNotificationPreferences.mockReturnValue(updatePromise)

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    const firstSwitch = switches[0]

    expect(firstSwitch).toBeChecked()

    // Click to toggle
    fireEvent.click(firstSwitch)

    // Switch should be disabled during update
    expect(firstSwitch).toBeDisabled()

    // All switches should be disabled during update
    switches.forEach((switchElement) => {
      expect(switchElement).toBeDisabled()
    })

    // Resolve the API call
    resolveUpdate!({ message: 'Updated successfully' })

    // Switches should be re-enabled
    await waitFor(() => {
      switches.forEach((switchElement) => {
        expect(switchElement).not.toBeDisabled()
      })
    })
  })

  it('handles empty preferences list gracefully', async () => {
    mockGetNotificationPreferences.mockResolvedValue([])

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('No notification types available.')).toBeInTheDocument()
    })

    // Should not show the table
    expect(screen.queryByText('Notification Type')).not.toBeInTheDocument()
    expect(screen.queryByText('Email')).not.toBeInTheDocument()
    expect(screen.queryByText('In-App')).not.toBeInTheDocument()
  })

  it('handles network errors during initial load', async () => {
    mockGetNotificationPreferences.mockRejectedValue(new Error('Failed to fetch'))

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
    })

    // Should not show the table or loading state
    expect(screen.queryByText('Notification Type')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('preserves preference state when API calls fail', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockRejectedValue(new Error('Update failed'))

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    const firstSwitch = switches[0]

    expect(firstSwitch).toBeChecked()

    // Click to toggle
    await fireEvent.click(firstSwitch)

    await waitFor(
      async () => {
        expect(await screen.findByTestId('error-alert')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Switch should revert to original state
    expect(firstSwitch).toBeChecked()
  })

  it('groups preferences correctly by notification group', async () => {
    const preferencesWithGroups = [
      ...mockPreferences,
      {
        type: 'system_maintenance',
        label: 'System Maintenance',
        group: 'system',
        email_enabled: true,
        in_app_enabled: true,
      },
    ]

    mockGetNotificationPreferences.mockResolvedValue(preferencesWithGroups)

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })

    // All helper_profile group items should be present
    expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    expect(screen.getByText('Placement Request Accepted')).toBeInTheDocument()
    expect(screen.getByText('Helper Response Accepted')).toBeInTheDocument()
    expect(screen.getByText('Helper Response Rejected')).toBeInTheDocument()

    // System group item should also be present
    expect(screen.getByText('System Maintenance')).toBeInTheDocument()
  })

  it('handles partial preference updates correctly', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('Response to Placement Request')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')

    // Toggle only the in-app preference for the first item
    fireEvent.click(switches[1])

    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({
        preferences: [
          {
            type: 'placement_request_response',
            email_enabled: true, // Should preserve existing value
            in_app_enabled: false, // Should update this value
          },
        ],
      })
    })
  })
})
