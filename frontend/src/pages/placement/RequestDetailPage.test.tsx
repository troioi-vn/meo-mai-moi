import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter, testQueryClient } from '@/testing'
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import RequestDetailPage from '@/pages/placement/RequestDetailPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import type { User } from '@/types/user'
import { getGetHelperProfilesQueryKey } from '@/api/generated/helper-profiles/helper-profiles'

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
  testQueryClient.clear()
  return renderWithRouter(component, {
    initialAuthState: { user, isLoading: false, isAuthenticated: !!user },
  })
}

const quickRequestPayload = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  pet_id: 1,
  user_id: 99,
  request_type: 'permanent',
  status: 'open',
  notes: null,
  pet: {
    id: 1,
    name: 'Minnie',
    photo_url: 'http://localhost:8000/storage/pets/1/photo.jpg',
    pet_type: { id: 1, name: 'Cat', slug: 'cat' },
    city: 'Nha Trang',
    country: 'VN',
  },
  viewer_role: 'public',
  my_response_id: null,
  responses: [],
  available_actions: {
    can_respond: false,
    can_quick_respond: true,
    can_cancel_my_response: false,
    can_accept_responses: false,
    can_reject_responses: false,
    can_confirm_handover: false,
    can_finalize: false,
    can_delete_request: false,
  },
  chat_id: null,
  ...overrides,
})

const signedInVisitor: User = {
  id: 3,
  name: 'Visitor',
  email: 'visitor@example.com',
  email_verified_at: '2025-01-01T00:00:00Z',
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
              can_quick_respond: false,
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
    }

    renderWithProviders(<RequestDetailPage />, ownerUser)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Helper One' })).toBeInTheDocument()
    })

    screen.getByRole('button', { name: 'Helper One' }).click()

    await waitFor(() => {
      expect(document.querySelector('[data-slot="drawer-content"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="drawer-title"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="drawer-description"]')).toBeInTheDocument()
    })
  })

  it('uses the reject endpoint when an owner rejects a response', async () => {
    let rejectCount = 0
    let cancelCount = 0
    const placementResponse = {
      id: 8,
      placement_request_id: 1,
      helper_profile_id: 5,
      status: 'responded',
      message: 'I can help!',
      responded_at: '2026-08-22T00:00:00Z',
      created_at: '2026-08-22T00:00:00Z',
      updated_at: '2026-08-22T00:00:00Z',
      helper_profile: {
        id: 5,
        user: { id: 2, name: 'Helper One', email: 'helper1@example.com' },
        city: 'Hanoi',
        state: null,
      },
    }

    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () =>
        HttpResponse.json({
          data: quickRequestPayload({
            user_id: 1,
            viewer_role: 'owner',
            response_count: 1,
            responses: [placementResponse],
            available_actions: {
              ...quickRequestPayload().available_actions,
              can_accept_responses: true,
              can_reject_responses: true,
            },
          }),
        })
      ),
      http.post('http://localhost:3000/api/placement-responses/8/reject', () => {
        rejectCount += 1
        return HttpResponse.json({ data: { ...placementResponse, status: 'rejected' } })
      }),
      http.post('http://localhost:3000/api/placement-responses/8/cancel', () => {
        cancelCount += 1
        return HttpResponse.json({ data: { ...placementResponse, status: 'cancelled' } })
      })
    )

    const owner: User = {
      id: 1,
      name: 'Owner',
      email: 'owner@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
    }

    renderWithProviders(<RequestDetailPage />, owner)

    const reject = await screen.findByRole('button', { name: /^reject$/i })
    reject.click()

    await waitFor(() => {
      expect(rejectCount).toBe(1)
    })
    expect(cancelCount).toBe(0)
  })

  it('confirms a handover against the transfer request, not the response', async () => {
    let confirmTransferCount = 0
    let acceptResponseCount = 0
    const acceptedResponse = {
      id: 8,
      placement_request_id: 1,
      helper_profile_id: 5,
      status: 'accepted',
      message: 'On my way!',
      responded_at: '2026-08-22T00:00:00Z',
      created_at: '2026-08-22T00:00:00Z',
      updated_at: '2026-08-22T00:00:00Z',
      helper_profile: {
        id: 5,
        user: { id: 3, name: 'Visitor', email: 'visitor@example.com' },
        city: 'Hanoi',
        state: null,
      },
      transfer_request: { id: 42, status: 'pending' },
    }

    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () =>
        HttpResponse.json({
          data: quickRequestPayload({
            status: 'pending_transfer',
            viewer_role: 'helper',
            my_response_id: 8,
            response_count: 1,
            responses: [acceptedResponse],
            available_actions: {
              ...quickRequestPayload().available_actions,
              can_quick_respond: false,
              can_confirm_handover: true,
            },
          }),
        })
      ),
      http.post('http://localhost:3000/api/transfer-requests/42/confirm', () => {
        confirmTransferCount += 1
        return HttpResponse.json({ data: { id: 42, status: 'confirmed' } })
      }),
      http.post('http://localhost:3000/api/placement-responses/:id/accept', () => {
        acceptResponseCount += 1
        return HttpResponse.json({ data: acceptedResponse })
      })
    )

    renderWithProviders(<RequestDetailPage />, signedInVisitor)

    const confirm = await screen.findByRole('button', { name: /confirm handover/i })
    confirm.click()

    await waitFor(() => {
      expect(confirmTransferCount).toBe(1)
    })
    expect(acceptResponseCount).toBe(0)
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
              can_respond: true,
              can_quick_respond: true, // Key: potential helper can respond
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
    }

    renderWithProviders(<RequestDetailPage />, potentialHelperUser)

    // Wait for the page and profiles to load
    await waitFor(
      () => {
        expect(document.querySelector('[role="combobox"]')).toBeInTheDocument()
        expect(document.querySelector('textarea')).toBeInTheDocument()
        expect(
          document.querySelector('button.w-full:not([data-variant="outline"])')
        ).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    expect(document.querySelector('textarea')).toBeInTheDocument()
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
              can_respond: false,
              can_quick_respond: false, // Key: user cannot respond (likely no profile)
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
    }

    renderWithProviders(<RequestDetailPage />, userWithoutProfile)

    // Wait for the page to load
    await waitFor(() => {
      expect(document.querySelector('button svg.lucide-user-plus')).toBeInTheDocument()
    })

    expect(document.querySelector('textarea')).not.toBeInTheDocument()
    expect(document.querySelector('button svg.lucide-user-plus')).toBeInTheDocument()
  })

  it('does not refetch helper profiles or blank the section when the request refetches', async () => {
    // Regression: the helper-profile fetch used to sit in a useEffect keyed on the
    // whole request object. A pending translation polls every 2.5s, each poll
    // replaced that object, and the response card swapped itself for a spinner.
    let requestHits = 0
    let profileHits = 0

    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () => {
        requestHits += 1
        return HttpResponse.json({
          data: {
            id: 1,
            pet_id: 1,
            user_id: 1,
            request_type: 'foster_free',
            status: 'open',
            // A brand new object identity on every call, as the real endpoint gives.
            notes: `Looking for a foster home (fetch ${String(requestHits)})`,
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
              can_respond: true,
              can_quick_respond: false,
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
      }),
      http.get('http://localhost:3000/api/helper-profiles', () => {
        profileHits += 1
        return HttpResponse.json({
          data: [{ id: 7, status: 'private', country: 'VN', city: 'Hanoi' }],
        })
      })
    )

    const helper: User = {
      id: 3,
      name: 'Regular User',
      email: 'user@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
    }

    renderWithProviders(<RequestDetailPage />, helper)

    await waitFor(() => {
      expect(document.querySelector('textarea')).toBeInTheDocument()
    })
    expect(profileHits).toBe(1)

    // Force the request query to refetch, the way a translation poll does.
    await testQueryClient.refetchQueries({ queryKey: ['/placement-requests/1'] })

    await waitFor(() => {
      expect(requestHits).toBeGreaterThan(1)
    })

    // The form stays mounted throughout and the profile list is not re-fetched.
    expect(document.querySelector('textarea')).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument()
    expect(profileHits).toBe(1)
  })

  it('puts the pet above the call to action for a stranger', async () => {
    // The bug in the screenshot: "No Helper Profile Found" rendered above
    // Minnie's photo, so the page led with paperwork instead of the animal.
    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () =>
        HttpResponse.json({
          data: {
            id: 1,
            pet_id: 1,
            user_id: 99,
            request_type: 'permanent',
            status: 'open',
            notes: 'Minnie is a sweet, playful cat.',
            pet: {
              id: 1,
              name: 'Minnie',
              photo_url: 'http://localhost:8000/storage/pets/1/photo.jpg',
              pet_type: { id: 1, name: 'Cat', slug: 'cat' },
              city: 'Nha Trang',
              country: 'VN',
            },
            viewer_role: 'public',
            my_response_id: null,
            responses: [],
            available_actions: {
              can_respond: false,
              can_quick_respond: true,
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
      ),
      http.get('http://localhost:3000/api/helper-profiles', () => HttpResponse.json({ data: [] }))
    )

    const visitor: User = {
      id: 3,
      name: 'Visitor',
      email: 'visitor@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
    }

    renderWithProviders(<RequestDetailPage />, visitor)

    const cta = await screen.findByRole('button', { name: /adopt minnie now/i })
    const petCard = screen.getByTestId('pet-information-card')

    // The hero photo is inside the card, and the card precedes the CTA.
    expect(petCard.querySelector('img[alt="Minnie"]')).toBeInTheDocument()
    // DOCUMENT_POSITION_FOLLOWING: the CTA comes after the pet card in the DOM.
    expect(petCard.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('puts the responses list first for the owner', async () => {
    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () =>
        HttpResponse.json({
          data: {
            id: 1,
            pet_id: 1,
            user_id: 1,
            request_type: 'permanent',
            status: 'open',
            notes: null,
            pet: {
              id: 1,
              name: 'Minnie',
              photo_url: 'http://localhost:8000/storage/pets/1/photo.jpg',
              pet_type: { id: 1, name: 'Cat', slug: 'cat' },
              city: 'Nha Trang',
              country: 'VN',
            },
            viewer_role: 'owner',
            my_response_id: null,
            responses: [],
            available_actions: {
              can_respond: false,
              can_quick_respond: false,
              can_cancel_my_response: false,
              can_accept_responses: true,
              can_reject_responses: true,
              can_confirm_handover: false,
              can_finalize: false,
              can_delete_request: true,
            },
            chat_id: null,
          },
        })
      )
    )

    const owner: User = {
      id: 1,
      name: 'Owner',
      email: 'owner@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
    }

    renderWithProviders(<RequestDetailPage />, owner)

    const petCard = await screen.findByTestId('pet-information-card')
    const [responsesHeading] = screen.getAllByText(/responses/i)
    if (!responsesHeading) throw new Error('expected a responses heading')

    // The pet card follows the responses list for an owner: they came to act on
    // offers, not to look at their own cat.
    const position = responsesHeading.compareDocumentPosition(petCard)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeGreaterThan(0)
  })

  it('sends the offer in one tap, with no form in the way', async () => {
    // The whole point of the fast path: somebody standing in a rescue taps once.
    // An earlier version asked for a phone number first and then, for guests,
    // dropped them on a login page after they had filled it in.
    let posted: unknown = undefined
    let responseSent = false
    const createdProfile = { id: 42, user_id: signedInVisitor.id, status: 'active' }

    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () =>
        HttpResponse.json({ data: quickRequestPayload() })
      ),
      http.get('http://localhost:3000/api/helper-profiles', () =>
        HttpResponse.json({ data: responseSent ? [createdProfile] : [] })
      ),
      http.post('http://localhost:3000/api/placement-requests/1/responses', async ({ request }) => {
        posted = await request.json()
        responseSent = true
        return HttpResponse.json({ data: { id: 5, status: 'responded' } }, { status: 201 })
      })
    )

    renderWithProviders(<RequestDetailPage />, signedInVisitor)

    const offer = await screen.findByRole('button', { name: /adopt minnie now/i })

    // No phone field, no message box, nothing to fill in.
    expect(document.querySelector('input[type="tel"]')).not.toBeInTheDocument()

    offer.click()

    await waitFor(() => {
      expect(posted).toBeDefined()
    })
    // Nothing is asked for, so nothing is sent: the backend derives the profile
    // from the request itself.
    expect(posted).toEqual({})

    // The empty profile list was already cached before the quick response.
    // Refresh it immediately so /helper shows the auto-created profile without
    // requiring a browser refresh.
    await waitFor(() => {
      expect(testQueryClient.getQueryData(getGetHelperProfilesQueryKey())).toEqual([createdProfile])
    })
  })

  it('explains that cancelling a response permanently prevents responding again', async () => {
    let cancelCount = 0
    const response = {
      id: 7,
      placement_request_id: 1,
      helper_profile_id: 42,
      status: 'responded',
      message: null,
      responded_at: '2026-08-22T00:00:00Z',
      created_at: '2026-08-22T00:00:00Z',
      updated_at: '2026-08-22T00:00:00Z',
    }

    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () =>
        HttpResponse.json({
          data: quickRequestPayload({
            viewer_role: 'helper',
            my_response_id: response.id,
            responses: [response],
            available_actions: {
              ...quickRequestPayload().available_actions,
              can_quick_respond: false,
              can_cancel_my_response: true,
            },
          }),
        })
      ),
      http.get('http://localhost:3000/api/helper-profiles', () => HttpResponse.json({ data: [] })),
      http.post('http://localhost:3000/api/placement-responses/7/cancel', () => {
        cancelCount += 1
        return HttpResponse.json({ data: { ...response, status: 'cancelled' } })
      })
    )

    renderWithProviders(<RequestDetailPage />, signedInVisitor)

    const cancelTrigger = await screen.findByRole('button', { name: /^cancel my response$/i })
    cancelTrigger.click()

    expect(cancelCount).toBe(0)
    expect(await screen.findByText('Cancel your offer to help Minnie?')).toBeInTheDocument()
    expect(
      screen.getByText(/once you cancel, you cannot respond to this request again/i)
    ).toBeInTheDocument()

    screen.getByRole('button', { name: /keep my response/i }).click()
    expect(cancelCount).toBe(0)

    cancelTrigger.click()
    screen.getByRole('button', { name: /yes, cancel my response/i }).click()

    await waitFor(() => {
      expect(cancelCount).toBe(1)
    })
  })

  it('completes the offer automatically when a guest returns from signing in', async () => {
    // They tapped "Adopt now" before being sent to auth, so finishing the action
    // on return is completing what they started, not posting something unasked.
    localStorage.setItem(
      'meo:pending-placement-response',
      JSON.stringify({ requestId: 1, message: '', phone: '', savedAt: Date.now() })
    )
    mockUseParams.mockReturnValue({ id: '1' })

    let postCount = 0
    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () =>
        HttpResponse.json({ data: quickRequestPayload() })
      ),
      http.get('http://localhost:3000/api/helper-profiles', () => HttpResponse.json({ data: [] })),
      http.post('http://localhost:3000/api/placement-requests/1/responses', () => {
        postCount += 1
        return HttpResponse.json({ data: { id: 5, status: 'responded' } }, { status: 201 })
      })
    )

    renderWithRouter(<RequestDetailPage />, {
      initialAuthState: {
        user: signedInVisitor,
        isLoading: false,
        isAuthenticated: true,
      },
      route: '/requests/1?resume=respond',
    })

    await waitFor(() => {
      expect(postCount).toBe(1)
    })

    // The intent is cleared and the param stripped, so a re-render cannot repeat it.
    expect(localStorage.getItem('meo:pending-placement-response')).toBeNull()
  })

  it('does not resume for someone who never asked', async () => {
    // No stored intent means they arrived at this URL some other way.
    localStorage.clear()
    mockUseParams.mockReturnValue({ id: '1' })

    let postCount = 0
    server.use(
      http.get('http://localhost:3000/api/placement-requests/1', () =>
        HttpResponse.json({ data: quickRequestPayload() })
      ),
      http.get('http://localhost:3000/api/helper-profiles', () => HttpResponse.json({ data: [] })),
      http.post('http://localhost:3000/api/placement-requests/1/responses', () => {
        postCount += 1
        return HttpResponse.json({ data: { id: 5 } }, { status: 201 })
      })
    )

    renderWithRouter(<RequestDetailPage />, {
      initialAuthState: {
        user: signedInVisitor,
        isLoading: false,
        isAuthenticated: true,
      },
      route: '/requests/1?resume=respond',
    })

    await screen.findByRole('button', { name: /adopt minnie now/i })
    expect(postCount).toBe(0)
  })
})
