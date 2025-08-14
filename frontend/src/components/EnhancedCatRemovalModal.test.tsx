import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EnhancedCatRemovalModal } from '@/components/EnhancedCatRemovalModal'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

import { renderWithRouter, userEvent } from '@/test-utils'
import { toast } from 'sonner'

describe('EnhancedCatRemovalModal', () => {
  const mockProps = {
    catId: '1',
    catName: 'Fluffy',
    onSuccess: vi.fn(),
  }

  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    server.use(
      http.delete('http://localhost:3000/api/cats/1', () => {
        return new HttpResponse(null, { status: 204 })
      }),
      http.put('http://localhost:3000/api/cats/1/status', () => {
        return HttpResponse.json({ data: {} })
      }),
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
        })
      })
    )
  })

  it('renders the trigger button', async () => {
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove cat/i })).toBeInTheDocument()
    })
  })

  it('opens the modal and shows step 1 when trigger is clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))

    expect(screen.getByText('Confirm Cat Name')).toBeInTheDocument()
    expect(screen.getByText(/type the cat's name exactly/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('')).toBeInTheDocument()
  })

  it('validates name confirmation in step 1', async () => {
    const user = userEvent.setup()
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))

    // Try to continue without typing the correct name
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(toast.error).toHaveBeenCalledWith('Please type "Fluffy" exactly to confirm')
  })

  it('proceeds to step 2 when correct name is entered', async () => {
    const user = userEvent.setup()
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

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
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

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
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

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
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

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
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Cat profile has been permanently deleted')
      expect(mockProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('calls updateCatStatus API when deceased action is confirmed', async () => {
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /mark as deceased/i }))
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /mark as deceased/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Cat has been marked as deceased')
      expect(mockProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    server.use(
      http.delete('http://localhost:3000/api/cats/1', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.any(String))
    })
    vi.restoreAllMocks()
  })

    it('allows navigation back between steps', async () => {
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

    await user.click(screen.getByRole('button', { name: /remove cat/i }))
    await user.type(screen.getByPlaceholderText('Fluffy'), 'Fluffy')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Go to step 3
    await user.click(screen.getByRole('button', { name: /delete permanently/i }))
    expect(screen.getByText('Confirm Your Password')).toBeInTheDocument()

  // Go back to step 2 - look for the first back button
  const backButtons = await screen.findAllByRole('button', { name: /back/i })
    await user.click(backButtons[0])
    await waitFor(() => {
      expect(screen.getByText('Choose Action')).toBeInTheDocument()
    })

  // Go back to step 1
  const backButtonsStep2 = await screen.findAllByRole('button', { name: /back/i })
    await user.click(backButtonsStep2[0])
    await waitFor(() => {
      expect(screen.getByText('Confirm Cat Name')).toBeInTheDocument()
    })
  })

  it('resets modal state when closed', async () => {
    renderWithRouter(<EnhancedCatRemovalModal {...mockProps} />)

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
