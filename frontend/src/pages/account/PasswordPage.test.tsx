import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import PasswordPage from './PasswordPage'

// Mock ChangePasswordForm to isolate page layout
vi.mock('@/components/ChangePasswordForm', () => ({
  ChangePasswordForm: () => <div data-testid="change-password-form">ChangePasswordFormMock</div>,
}))

describe('PasswordPage', () => {
  const renderPage = () => {
    render(
      <BrowserRouter>
        <PasswordPage />
      </BrowserRouter>
    )
  }

  it('renders breadcrumbs and header', () => {
    renderPage()
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument()
  })

  it('renders change password form container', () => {
    renderPage()
    expect(screen.getByTestId('change-password-form')).toBeInTheDocument()
  })

  it('has back to account link', () => {
    renderPage()
    const backLink = screen.getByRole('link', { name: /back to account/i })
    expect(backLink).toHaveAttribute('href', '/account')
  })
})
