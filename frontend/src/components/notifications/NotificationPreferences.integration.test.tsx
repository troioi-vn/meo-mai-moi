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

// Mock the Axios api instance for Telegram status
vi.mock('@/api/axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/axios')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn().mockResolvedValue({ is_connected: false }),
      post: vi.fn().mockResolvedValue({ link_url: 'https://t.me/bot?start=abc' }),
      delete: vi.fn().mockResolvedValue({}),
    },
  }
})

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
    telegram_enabled: false,
  },
  {
    type: 'placement_request_accepted',
    label: 'Placement Request Accepted',
    group: 'helper_profile',
    email_enabled: false,
    in_app_enabled: true,
    telegram_enabled: false,
  },
  {
    type: 'helper_response_accepted',
    label: 'Helper Response Accepted',
    group: 'helper_profile',
    email_enabled: true,
    in_app_enabled: false,
    telegram_enabled: false,
  },
  {
    type: 'helper_response_rejected',
    label: 'Helper Response Rejected',
    group: 'helper_profile',
    email_enabled: false,
    in_app_enabled: false,
    telegram_enabled: false,
  },
]

describe('NotificationPreferences Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testQueryClient.clear()
  })

  const waitForLoadedPreferences = async (expectedSwitchCount = 12) => {
    await waitFor(() => {
      expect(mockGetNotificationPreferences).toHaveBeenCalledTimes(1)
      expect(screen.getAllByRole('switch')).toHaveLength(expectedSwitchCount)
    })
  }

  it('handles complete user workflow of loading and updating preferences', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    renderWithRouter(<NotificationPreferences />)

    await waitForLoadedPreferences()

    // Get all switches
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(12) // 4 preferences × 3 switches each

    // Verify initial states match mock data
    expect(switches[0]).toBeChecked() // placement_request_response email
    expect(switches[1]).toBeChecked() // placement_request_response in_app
    expect(switches[2]).not.toBeChecked() // placement_request_response telegram
    expect(switches[3]).not.toBeChecked() // placement_request_accepted email

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
            telegram_enabled: false,
          },
        ],
      })
    })

    // Verify success message appears
    expect(toast.success).toHaveBeenCalledWith('Notification settings saved', undefined)
  })

  it('handles multiple rapid preference changes correctly', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    renderWithRouter(<NotificationPreferences />)

    await waitForLoadedPreferences()

    const switches = screen.getAllByRole('switch')

    // Rapidly toggle multiple switches
    fireEvent.click(switches[0]) // First email switch
    fireEvent.click(switches[1]) // First in-app switch
    fireEvent.click(switches[2]) // First telegram switch

    // Should debounce and only make the final API call
    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledTimes(1)
    })
  })

  it('handles API errors gracefully and shows error messages', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockRejectedValue(new Error('Network error'))

    renderWithRouter(<NotificationPreferences />)

    await waitForLoadedPreferences()

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

    await waitForLoadedPreferences()

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
      expect(mockGetNotificationPreferences).toHaveBeenCalledTimes(1)
      expect(screen.queryAllByRole('switch')).toHaveLength(0)
    })

    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument()
  })

  it('handles network errors during initial load', async () => {
    mockGetNotificationPreferences.mockRejectedValue(new Error('Failed to fetch'))

    renderWithRouter(<NotificationPreferences />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
    })

    // Should not show toggle controls
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('preserves preference state when API calls fail', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockRejectedValue(new Error('Update failed'))

    renderWithRouter(<NotificationPreferences />)

    await waitForLoadedPreferences()

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
        telegram_enabled: false,
      },
    ]

    mockGetNotificationPreferences.mockResolvedValue(preferencesWithGroups)

    renderWithRouter(<NotificationPreferences />)

    await waitForLoadedPreferences(15)
    expect(screen.getAllByRole('heading', { level: 4 }).length).toBeGreaterThanOrEqual(2)
  })

  it('handles partial preference updates correctly', async () => {
    mockGetNotificationPreferences.mockResolvedValue(mockPreferences)
    mockUpdateNotificationPreferences.mockResolvedValue({
      data: null,
      message: 'Updated successfully',
    })

    renderWithRouter(<NotificationPreferences />)

    await waitForLoadedPreferences()

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
            telegram_enabled: false, // Should preserve existing value
          },
        ],
      })
    })
  })
})
