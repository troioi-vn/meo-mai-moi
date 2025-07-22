import { screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import CreateCatPage from './CreateCatPage'
import MyCatsPage from './MyCatsPage'
import { toast } from 'sonner'
import { mockUser } from '@/mocks/data/user'

// Mock the toast module
vi.mock('sonner')

describe('CreateCatPage', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    server.use(
      http.get('http://localhost:3000/api/user', () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return HttpResponse.json(mockUser)
      }),
      http.get('http://localhost:3000/api/cats', () => {
        return HttpResponse.json({ data: [] })
      })
    )
  })

  it('renders the form fields', async () => {
    renderWithRouter(<CreateCatPage />)
    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Breed')).toBeInTheDocument()
      expect(screen.getByLabelText('Birthday')).toBeInTheDocument()
      expect(screen.getByLabelText('Location')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })
  })

  it('renders cancel button that navigates back to my cats page', async () => {
    renderWithRouter(<CreateCatPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('submits the form with birthday and redirects on success', async () => {
    // Mock the API response
    server.use(
      http.post('http://localhost:8000/api/cats', async ({ request }) => {
        const newCat = (await request.json()) as Record<string, any>
        return HttpResponse.json({ data: { id: 1, ...newCat } }, { status: 201 })
      })
    )

    renderWithRouter(
      <>
        <CreateCatPage />
        <MyCatsPage />
      </>,
      {
        route: '/account/cats/create',
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      }
    )

    await user.type(screen.getByLabelText('Name'), 'Fluffy')
    await user.type(screen.getByLabelText('Breed'), 'Persian')
    // Note: userEvent.type for date inputs can be tricky.
    // We'll directly set the value for reliability in tests.
    const birthdayInput = screen.getByLabelText('Birthday')
    fireEvent.change(birthdayInput, { target: { value: '2023-01-01' } })

    await user.type(screen.getByLabelText('Location'), 'New York')
    await user.type(screen.getByLabelText('Description'), 'A very cute cat')

    await user.click(screen.getByRole('button', { name: 'Create Cat' }))

    // Check that we've navigated to the My Cats page
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Cats/i })).toBeInTheDocument()
    })
    // Assert toast.success was called
    expect(toast.success).toHaveBeenCalledWith('Cat created successfully!')
  })

  it('displays validation errors for empty required fields', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWithRouter(<CreateCatPage />)

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: 'Create Cat' }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/breed is required/i)).toBeInTheDocument()
      expect(screen.getByText(/birthday is required/i)).toBeInTheDocument()
    })
    vi.restoreAllMocks()
  })

  it('navigates back to my cats page when cancel button is clicked', async () => {
    renderWithRouter(
      <>
        <CreateCatPage />
        <MyCatsPage />
      </>,
      {
        route: '/account/cats/create',
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      }
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Cats/i })).toBeInTheDocument()
    })
  })

  it('displays error message when API call fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock API error
    server.use(
      http.post('http://localhost:3000/api/cats', () => {
        return HttpResponse.json({ message: 'Failed to create cat' }, { status: 500 })
      })
    )

    renderWithRouter(<CreateCatPage />)

    // Fill out the form completely so validation passes
    await user.type(screen.getByLabelText('Name'), 'Fluffy')
    await user.type(screen.getByLabelText('Breed'), 'Persian')
    await user.type(screen.getByLabelText('Birthday'), '2023-01-01')
    await user.type(screen.getByLabelText('Location'), 'New York')
    await user.type(screen.getByLabelText('Description'), 'A very cute cat')

    // Submit the form
    await user.click(screen.getByRole('button', { name: 'Create Cat' }))

    await waitFor(async () => {
      expect(await screen.findByTestId('form-error')).toHaveTextContent(/failed to create cat/i)
    })
    // Assert toast.error was called
    expect(toast.error).toHaveBeenCalledWith('Failed to create cat.')
    vi.restoreAllMocks()
  })
})
