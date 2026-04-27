import { screen, waitFor } from '@testing-library/react'
import { describe, it, beforeEach } from 'vite-plus/test'
import { renderWithRouter } from '@/testing'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import GptConnectPage from './GptConnectPage'

describe('GptConnectPage', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            telegram_bot_username: 'meo_test_bot',
          },
        })
      }),
      http.post('http://localhost:3000/api/gpt-auth/telegram-link', async ({ request }) => {
        const body = (await request.json()) as {
          session_id?: string
          session_sig?: string
        }

        if (body.session_id === 'session-123' && body.session_sig === 'sig-456') {
          return HttpResponse.json({
            data: {
              telegram_login_token: 'shorttoken',
            },
          })
        }

        return HttpResponse.json({ message: 'invalid session' }, { status: 400 })
      })
    )
  })

  it('shows Google and Telegram login links for GPT connector auth', async () => {
    renderWithRouter(<GptConnectPage />, {
      route: '/gpt-connect?session_id=session-123&session_sig=sig-456',
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /sign in with telegram/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute(
      'href',
      '/auth/google/redirect?redirect=%2Fgpt-connect%3Fsession_id%3Dsession-123%26session_sig%3Dsig-456'
    )

    expect(screen.getByRole('link', { name: /sign in with telegram/i })).toHaveAttribute(
      'href',
      'https://t.me/meo_test_bot?start=login_shorttoken'
    )
  })
})
