import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import LandingPage from './LandingPage'
import { server } from '@/testing/mocks/server'
import { renderWithRouter } from '@/testing'

describe('LandingPage', () => {
  it('shows Telegram auth buttons when a bot username is configured', async () => {
    server.use(
      http.get('http://localhost:3000/api/settings/public', () =>
        HttpResponse.json({
          success: true,
          data: {
            app_name: 'Meo Mai Moi',
            google_oauth_enabled: true,
            telegram_bot_username: 'meo_test_bot',
          },
        })
      ),
      http.get('http://localhost:3000/api/pets/placement-requests', () =>
        HttpResponse.json({
          success: true,
          data: [],
        })
      )
    )

    renderWithRouter(<LandingPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign up with telegram/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /sign in with telegram/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up with telegram/i })).toHaveAttribute(
      'href',
      'https://t.me/meo_test_bot?start=login'
    )
    expect(screen.getByRole('link', { name: /sign in with telegram/i })).toHaveAttribute(
      'href',
      'https://t.me/meo_test_bot?start=login'
    )
  })
})
