import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/testing'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'

import { SetPasswordComponent } from './SetPasswordComponent'
import { mockUser } from '@/testing/mocks/data/user'

// Ensure ProgressEvent is available for MSW's XHR interceptor in Node
if (!(globalThis as { ProgressEvent?: unknown }).ProgressEvent) {
  class PolyfillProgressEvent extends Event {
    lengthComputable = false
    loaded = 0
    total = 0
    constructor(
      type: string,
      init?: { lengthComputable?: boolean; loaded?: number; total?: number }
    ) {
      super(type)
      if (init) {
        this.lengthComputable = !!init.lengthComputable
        this.loaded = init.loaded ?? 0
        this.total = init.total ?? 0
      }
    }
  }
  ;(globalThis as { ProgressEvent?: unknown }).ProgressEvent = PolyfillProgressEvent
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SetPasswordComponent', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  const renderComponent = () => {
    return renderWithRouter(<SetPasswordComponent />, {
      initialAuthState: {
        user: { ...mockUser, email: 'oauth@example.com' },
        isAuthenticated: true,
      },
    })
  }

  it('sends reset email and shows success message without redirect', async () => {
    server.use(
      http.post('http://localhost:3000/api/password/email', () => {
        return HttpResponse.json({ data: { message: 'Password reset link sent' } })
      })
    )

    renderComponent()

    await user.click(screen.getByRole('button', { name: /set password via email/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/we have sent you an email with password reset instructions/i)
      ).toBeInTheDocument()
    })
  })

  it('shows error message when request fails', async () => {
    server.use(
      http.post('http://localhost:3000/api/password/email', () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 })
      })
    )

    renderComponent()

    await user.click(screen.getByRole('button', { name: /set password via email/i }))

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    })
  })
})
