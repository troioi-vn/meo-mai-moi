import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RequestDetailPage from '@/pages/placement/RequestDetailPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import type { User } from '@/types/user'

// Mock useParams to return the request ID
const mockUseParams = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => mockUseParams(),
  }
})

const renderWithProviders = (component: React.ReactElement, user: User | null = null) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider initialUser={user} initialLoading={false} skipInitialLoad={true}>
          {component}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RequestDetailPage', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: '1' })
  })

  it('opens helper profile drawer when owner clicks helper name in Responses list', async () => {
    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () => {
        return HttpResponse.json({
          data: {
            id: 1,
            pet_id: 1,
            user_id: 1,
            request_type: 'foster_free',
            status: 'open',
            notes: 'Looking for a foster home',
            start_date: '2025-01-15',
            end_date: '2025-02-15',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            response_count: 1,
            responses: [
              {
                id: 10,
                placement_request_id: 1,
                helper_profile_id: 5,
                status: 'responded',
                message: 'I can help!',
                responded_at: '2025-01-02T00:00:00Z',
                created_at: '2025-01-02T00:00:00Z',
                updated_at: '2025-01-02T00:00:00Z',
                helper_profile: {
                  id: 5,
                  user: { id: 2, name: 'Helper One', email: 'helper1@example.com' },
                  city: 'Hanoi',
                  state: null,
                },
              },
            ],
            pet: {
              id: 1,
              name: 'Fluffy',
              photo_url: 'http://localhost:8000/storage/pets/1/photo.jpg',
              pet_type: { id: 1, name: 'Cat', slug: 'cat' },
              city: 'Hanoi',
              country: 'VN',
            },
            viewer_role: 'owner',
            my_response_id: null,
            available_actions: {
              can_respond: false,
              can_cancel_my_response: false,
              can_accept_responses: true,
              can_reject_responses: true,
              can_confirm_handover: false,
              can_finalize: false,
              can_delete_request: false,
            },
            chat_id: null,
          },
        })
      })
    )

    server.use(
      http.get('http://localhost:3000/api/helper-profiles/5', () => {
        return HttpResponse.json({
          data: {
            id: 5,
            user_id: 2,
            user: { id: 2, name: 'Helper One', email: 'helper1@example.com' },
            city: 'Hanoi',
            state: null,
            country: 'VN',
            phone_number: '+84123456789',
            has_pets: true,
            has_children: false,
            about: 'About helper',
            experience: 'Experience helper',
            photos: [],
            status: 'active',
            request_types: ['foster_free'],
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        })
      })
    )

    const ownerUser: User = {
      id: 1,
      name: 'Owner User',
      email: 'owner@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    renderWithProviders(<RequestDetailPage />, ownerUser)

    await waitFor(() => {
      expect(screen.getByText('Responses')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Helper One' })).toBeInTheDocument()
    })

    screen.getByRole('button', { name: 'Helper One' }).click()

    await waitFor(() => {
      expect(screen.getByText('Helper Profile')).toBeInTheDocument()
      expect(screen.getByText("Viewing Helper One's profile")).toBeInTheDocument()
    })
  })

  it('shows "Send Response" button when potential helper views open placement request', async () => {
    // Mock the placement request API to return an open request with can_respond: true
    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () => {
        return HttpResponse.json({
          data: {
            id: 1,
            pet_id: 1,
            user_id: 1,
            request_type: 'foster_free',
            status: 'open',
            notes: 'Looking for a foster home',
            start_date: '2025-01-15',
            end_date: '2025-02-15',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            response_count: 0,
            responses: [],
            pet: {
              id: 1,
              name: 'Fluffy',
              photo_url: 'http://localhost:8000/storage/pets/1/photo.jpg',
              pet_type: {
                id: 1,
                name: 'Cat',
                slug: 'cat',
              },
              city: 'Hanoi',
              country: 'VN',
            },
            viewer_role: 'public', // Potential helper (not yet a helper for this request)
            my_response_id: null,
            available_actions: {
              can_respond: true, // Key: potential helper can respond
              can_cancel_my_response: false,
              can_accept_responses: false,
              can_reject_responses: false,
              can_confirm_handover: false,
              can_finalize: false,
              can_delete_request: false,
            },
            chat_id: null,
          },
        })
      })
    )

    // Mock helper profiles API (needed for the response form)
    server.use(
      http.get('http://localhost:3000/api/helper-profiles', () => {
        return HttpResponse.json({
          data: [
            {
              id: 1,
              user_id: 2,
              city: 'Hanoi',
              state: null,
              address: '123 Main St',
              zip_code: '10000',
              phone: '+84123456789',
              phone_number: '+84123456789',
              about: 'I love helping pets',
              status: 'active',
              request_types: ['foster_free', 'pet_sitting'],
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z',
            },
          ],
        })
      })
    )

    // Create a potential helper user with active helper profile
    const potentialHelperUser: User = {
      id: 2,
      name: 'Helper User',
      email: 'helper@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    renderWithProviders(<RequestDetailPage />, potentialHelperUser)

    // Wait for the page and profiles to load
    await waitFor(
      () => {
        expect(screen.getByText('Foster (Free)')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /send response/i })).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Check if the "Your Response" section is visible
    expect(screen.getByText('Your Response')).toBeInTheDocument()

    // Also verify the page shows the correct request details
    expect(screen.getByText('Foster (Free)')).toBeInTheDocument()
  })

  it('shows "Create Helper Profile" button when potential helper has no profile', async () => {
    // Mock the placement request API to return an open request where user cannot respond (e.g. no profile)
    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () => {
        return HttpResponse.json({
          data: {
            id: 1,
            pet_id: 1,
            user_id: 1,
            request_type: 'foster_free',
            status: 'open',
            notes: 'Looking for a foster home',
            pet: {
              id: 1,
              name: 'Fluffy',
              photo_url: 'http://localhost:8000/storage/pets/1/photo.jpg',
              pet_type: { id: 1, name: 'Cat', slug: 'cat' },
              city: 'Hanoi',
              country: 'VN',
            },
            viewer_role: 'public',
            my_response_id: null,
            available_actions: {
              can_respond: false, // Key: user cannot respond (likely no profile)
              can_cancel_my_response: false,
              can_accept_responses: false,
              can_reject_responses: false,
              can_confirm_handover: false,
              can_finalize: false,
              can_delete_request: false,
            },
            chat_id: null,
          },
        })
      })
    )

    // Mock empty helper profiles
    server.use(
      http.get('http://localhost:3000/api/helper-profiles', () => {
        return HttpResponse.json({ data: [] })
      })
    )

    // User without helper profile
    const userWithoutProfile: User = {
      id: 3,
      name: 'Regular User',
      email: 'user@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    renderWithProviders(<RequestDetailPage />, userWithoutProfile)

    // Wait for the page to load
    await waitFor(() => {
      // Use regex for heading name because it contains the status badge too
      expect(screen.getByRole('heading', { name: /foster \(free\)/i })).toBeInTheDocument()
    })

    // Should see "Your Response" section
    expect(screen.getByText('Your Response')).toBeInTheDocument()

    // Should NOT see Send Response button directly
    expect(screen.queryByRole('button', { name: /send response/i })).not.toBeInTheDocument()

    // Instead, should show prompt to create profile
    expect(screen.getByRole('button', { name: /create helper profile/i })).toBeInTheDocument()
  })
})
