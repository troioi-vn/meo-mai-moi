// eslint-disable-next-line @typescript-eslint/no-unsafe-return
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})
import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import RegisterPage from './RegisterPage'
import { useNavigate } from 'react-router-dom'
vi.mock('sonner', async () => {
  const actual = await vi.importActual('sonner')
  return {
    ...actual,
    toast: {
      success: vi.fn(),
    },
  }
})
import { toast } from 'sonner'
import { server } from '@/mocks/server'
import { HttpResponse, http } from 'msw'
import { mockUser } from '@/mocks/data/user'

describe('RegisterPage', () => {
  it('renders the register page correctly', async () => {
    renderWithRouter(<RegisterPage />, { route: '/register' })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })
  })

  it('registers a new user and navigates to login on success', async () => {
    // Mock the register endpoint
    server.use(
      http.post('http://localhost:3000/api/register', async ({ request }) => {
        const data = await request.json()
        if (typeof data === 'object' && data !== null && 'email' in data) {
          if (data.email === mockUser.email) {
            return HttpResponse.json({ message: 'Email already taken.' }, { status: 422 })
          }
          return HttpResponse.json(
            { user: { ...mockUser, ...(data as Record<string, unknown>) } },
            { status: 201 }
          )
        }
        return HttpResponse.json({ message: 'Invalid request' }, { status: 400 })
      })
    )

    const navigate = vi.fn()
    ;(useNavigate as unknown as () => typeof navigate) = () => navigate
    renderWithRouter(<RegisterPage />, { route: '/register' })
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/name/i), 'New User')
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('You are registered, now login please.')
    })

    // Assert navigation to /login
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/login')
    })
  })
})
