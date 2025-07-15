import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChangePasswordForm } from './ChangePasswordForm'
import { useAuth } from '@/hooks/use-auth'

vi.mock('@/hooks/use-auth')
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}))

describe('ChangePasswordForm', () => {
  const mockChangePassword = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: 'Test User', email: 'test@example.com' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false,
      loadUser: vi.fn(),
      changePassword: mockChangePassword,
      deleteAccount: vi.fn(),
    })
  })

  it('renders all form fields', () => {
    render(<ChangePasswordForm />)

    // Check that all three password inputs exist
    const inputs = document.querySelectorAll('input[type="password"]')
    expect(inputs).toHaveLength(3)

    expect(screen.getByText('Current Password')).toBeInTheDocument()
    expect(screen.getByText('New Password')).toBeInTheDocument()
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

    const submitButton = screen.getByRole('button', { name: /change password/i })
    await user.click(submitButton)

    expect(screen.getByText(/current password is required/i)).toBeInTheDocument()
    expect(screen.getByText(/new password must be at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/confirm new password is required/i)).toBeInTheDocument()
  })

  it('shows error when new passwords do not match', async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

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
    const user = userEvent.setup()
    mockChangePassword.mockResolvedValue(undefined)

    render(<ChangePasswordForm />)

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

    expect(mockChangePassword).toHaveBeenCalledWith(
      'currentpass',
      'newpassword123',
      'newpassword123'
    )
  })

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup()
    mockChangePassword.mockImplementation(
      () =>
        new Promise(() => {
          // This promise never resolves to test loading state
        })
    )

    render(<ChangePasswordForm />)

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
