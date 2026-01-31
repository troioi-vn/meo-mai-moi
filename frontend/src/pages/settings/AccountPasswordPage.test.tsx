import { screen } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import { describe, it, expect, vi } from 'vitest'
import AccountPasswordPage from './AccountPasswordPage'

// Mock ChangePasswordForm to isolate page layout
vi.mock('@/components/auth/ChangePasswordForm', () => ({
  ChangePasswordForm: () => <div data-testid="change-password-form">ChangePasswordFormMock</div>,
}))

describe('AccountPasswordPage', () => {
  const renderPage = () => {
    renderWithRouter(<AccountPasswordPage />)
  }

  it('renders breadcrumbs and header', () => {
    renderPage()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument()
  })

  it('renders change password form container', () => {
    renderPage()
    expect(screen.getByTestId('change-password-form')).toBeInTheDocument()
  })

  it('has back to settings link', () => {
    renderPage()
    const backLink = screen.getByRole('link', { name: /back to settings/i })
    expect(backLink).toHaveAttribute('href', '/settings/account')
  })
})
