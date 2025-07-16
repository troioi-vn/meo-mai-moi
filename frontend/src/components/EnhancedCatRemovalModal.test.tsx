import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EnhancedCatRemovalModal } from '@/components/EnhancedCatRemovalModal'
import { toast } from 'sonner'
import type { Cat } from '@/types/cat'

// Mock the API functions
vi.mock('@/api/cats', () => ({
  deleteCat: vi.fn(),
  updateCatStatus: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('EnhancedCatRemovalModal', () => {
  const mockProps = {
    catId: '1',
    catName: 'Fluffy',
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the trigger button', () => {
    render(<EnhancedCatRemovalModal {...mockProps} />)
    expect(screen.getByRole('button', { name: /remove cat/i })).toBeInTheDocument()
  })

  it('opens the modal and shows step 1 when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))

    expect(screen.getByText('Confirm Cat Name')).toBeInTheDocument()
    expect(screen.getByText(/type the cat's name exactly/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('')).toBeInTheDocument()
  })

  it('validates name confirmation in step 1', async () => {
    const user = userEvent.setup()
    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))

    // Try to continue without typing the correct name
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(toast.error).toHaveBeenCalledWith('Please type "Fluffy" exactly to confirm')
  })

  it('proceeds to step 2 when correct name is entered', async () => {
    const user = userEvent.setup()
    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))

    // Type the correct cat name
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByText('Choose Action')).toBeInTheDocument()
    expect(screen.getByText('Delete Permanently')).toBeInTheDocument()
    expect(screen.getByText('Mark as Deceased')).toBeInTheDocument()
  })

  it('proceeds to step 3 when delete action is selected', async () => {
    const user = userEvent.setup()
    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Click delete permanently
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))

    expect(screen.getByText('Confirm Your Password')).toBeInTheDocument()
    expect(screen.getByText(/permanently delete Fluffy's profile/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('proceeds to step 3 when deceased action is selected', async () => {
    const user = userEvent.setup()
    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Click mark as deceased
    await user.click(screen.getByRole('button', { name: /mark as deceased/i }))

    expect(screen.getByText('Confirm Your Password')).toBeInTheDocument()
    expect(screen.getByText(/mark Fluffy as deceased/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('validates password in step 3', async () => {
    const user = userEvent.setup()
    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))

    // Submit button should be disabled without password
    const submitButton = screen.getByRole('button', { name: /delete permanently/i })
    expect(submitButton).toBeDisabled()

    // Should be enabled after entering password
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'testpass')
    expect(submitButton).toBeEnabled()
  })

  it('calls deleteCat API when delete action is confirmed', async () => {
    const { deleteCat } = await import('@/api/cats')
    const user = userEvent.setup()

    vi.mocked(deleteCat).mockResolvedValue(undefined)

    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))

    expect(deleteCat).toHaveBeenCalledWith('1', 'password123')

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Cat profile has been permanently deleted')
      expect(mockProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('calls updateCatStatus API when deceased action is confirmed', async () => {
    const { updateCatStatus } = await import('@/api/cats')
    const user = userEvent.setup()

    vi.mocked(updateCatStatus).mockResolvedValue({
      id: 1,
      name: 'Fluffy',
      status: 'dead',
      breed: 'Persian',
      birthday: '2020-01-01',
      location: 'Test Location',
      description: 'Test description',
      user_id: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    } satisfies Cat)

    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /mark as deceased/i }))
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /mark as deceased/i }))

    expect(updateCatStatus).toHaveBeenCalledWith('1', 'dead', 'password123')

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Cat has been marked as deceased')
      expect(mockProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    const { deleteCat } = await import('@/api/cats')
    const { AxiosError } = await import('axios')
    const user = userEvent.setup()

    const mockError = new AxiosError('Request failed')
    mockError.response = {
      data: {
        message: 'Invalid password',
        errors: {
          password: ['The provided password does not match our records.'],
        },
      },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: {} as never,
    }

    vi.mocked(deleteCat).mockRejectedValue(mockError)

    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('The provided password does not match our records.')
    })
  })

  it.skip('allows navigation back between steps', async () => {
    const user = userEvent.setup()
    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Go to step 3
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))
    expect(screen.getByText('Confirm Your Password')).toBeInTheDocument()

    // Go back to step 2 - look for the first back button
    const backButtons = screen.getAllByRole('button', { name: /back/i })
    await user.click(backButtons[0])
    expect(screen.getByText('Choose Action')).toBeInTheDocument()

    // Go back to step 1
    const backButtonsStep2 = screen.getAllByRole('button', { name: /back/i })
    await user.click(backButtonsStep2[0])
    expect(screen.getByText('Confirm Cat Name')).toBeInTheDocument()
  })

  it('resets modal state when closed', async () => {
    const user = userEvent.setup()
    render(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'test')

    // Close modal
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    // Reopen modal
    await user.click(screen.getByRole('button', { name: /remove cat/i }))

    // Should be back to step 1 with empty input
    expect(screen.getByText('Confirm Cat Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Fluffy')).toHaveValue('')
  })
})
