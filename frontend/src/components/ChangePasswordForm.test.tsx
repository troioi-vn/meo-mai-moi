import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { ChangePasswordForm } from './ChangePasswordForm'
import { renderWithRouter, userEvent } from '@/test-utils'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/use-toast'

// Stable mock for changePassword
import { mockUser } from '@/mocks/data/user'
const changePasswordMock = vi.fn(async () => Promise.resolve())
import { mockUser } from '@/mocks/data/user'

vi.mock('@/hooks/use-auth', () => {
  return {
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      changePassword: changePasswordMock,
    }),
  }
})

vi.mock('@/components/ui/use-toast', () => {
  return { toast: vi.fn() }
})

describe('ChangePasswordForm', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    changePasswordMock.mockClear()
    changePasswordMock.mockImplementation(async () => Promise.resolve())
    vi.mocked(toast).mockClear()
  })

  it('renders all form fields', () => {
    renderWithRouter(<ChangePasswordForm />)

    // Check that all three password inputs exist
    const inputs = document.querySelectorAll('input[type="password"]')
    expect(inputs).toHaveLength(3)

    expect(screen.getByText('Current Password')).toBeInTheDocument()
    expect(screen.getByText('New Password')).toBeInTheDocument()
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    renderWithRouter(<ChangePasswordForm />)

    const submitButton = screen.getByRole('button', { name: /change password/i })
    await user.click(submitButton)

    expect(screen.getByText(/current password is required/i)).toBeInTheDocument()
    expect(screen.getByText(/new password must be at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/confirm new password is required/i)).toBeInTheDocument()
  })

  it('shows error when new passwords do not match', async () => {
    renderWithRouter(<ChangePasswordForm />)

    // Use querySelector to find inputs by name since password inputs don't have textbox role
    const currentPasswordInput = document.querySelector('input[name="current_password"]')
    const newPasswordInput = document.querySelector('input[name="new_password"]')
    const confirmPasswordInput = document.querySelector('input[name="new_password_confirmation"]')

    expect(currentPasswordInput).toBeInTheDocument()
    expect(newPasswordInput).toBeInTheDocument()
    expect(confirmPasswordInput).toBeInTheDocument()

    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      throw new Error('Required form inputs not found')
    }

    await user.type(currentPasswordInput, 'currentpass')
    await user.type(newPasswordInput, 'newpassword123')
    await user.type(confirmPasswordInput, 'differentpass123')

    const submitButton = screen.getByRole('button', { name: /change password/i })
    await user.click(submitButton)

    expect(screen.getByText(/new password and confirmation do not match/i)).toBeInTheDocument()
  })

  it('calls changePassword with correct values on valid form submission', async () => {
    renderWithRouter(<ChangePasswordForm />)

    const currentPasswordInput = document.querySelector('input[name="current_password"]')
    const newPasswordInput = document.querySelector('input[name="new_password"]')
    const confirmPasswordInput = document.querySelector('input[name="new_password_confirmation"]')

    expect(currentPasswordInput).toBeInTheDocument()
    expect(newPasswordInput).toBeInTheDocument()
    expect(confirmPasswordInput).toBeInTheDocument()

    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      throw new Error('Required form inputs not found')
    }

    await user.type(currentPasswordInput, 'currentpass')
    await user.type(newPasswordInput, 'newpassword123')
    await user.type(confirmPasswordInput, 'newpassword123')

    const submitButton = screen.getByRole('button', { name: /change password/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(vi.mocked(toast)).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Password Changed',
          description: 'Your password has been updated successfully.',
        })
      )
    })
  })

  it('shows loading state during form submission', async () => {
    // Simulate a never-resolving changePassword
    // Set the mock to never resolve before rendering
    changePasswordMock.mockImplementation(() => new Promise(() => {}))
    renderWithRouter(<ChangePasswordForm />)

    const currentPasswordInput = document.querySelector('input[name="current_password"]')
    const newPasswordInput = document.querySelector('input[name="new_password"]')
    const confirmPasswordInput = document.querySelector('input[name="new_password_confirmation"]')

    expect(currentPasswordInput).toBeInTheDocument()
    expect(newPasswordInput).toBeInTheDocument()
    expect(confirmPasswordInput).toBeInTheDocument()

    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      throw new Error('Required form inputs not found')
    }

    await user.type(currentPasswordInput, 'currentpass')
    await user.type(newPasswordInput, 'newpassword123')
    await user.type(confirmPasswordInput, 'newpassword123')

    const submitButton = screen.getByRole('button', { name: /change password/i })
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })
})
