import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter, testQueryClient } from '@/testing'
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import { PlacementPosterPage } from './PlacementPosterPage'

const mockUseParams = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => mockUseParams() }
})

const posterPayload = (overrides: Record<string, unknown> = {}) => ({
  id: 27,
  pet_id: 1,
  user_id: 1,
  request_type: 'permanent',
  status: 'open',
  notes: 'Minnie is a sweet, playful cat.\n\nShe gets along with male cats.',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  response_count: 0,
  pet: {
    id: 1,
    name: 'Minnie',
    photo_url: 'http://localhost:8000/storage/pets/1/photo.jpg',
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

const serveRequest = (overrides: Record<string, unknown> = {}) => {
  server.use(
    http.get('http://localhost:3000/api/placement-requests/27', () =>
      HttpResponse.json({ data: posterPayload(overrides) })
    )
  )
}

describe('PlacementPosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testQueryClient.clear()
    mockUseParams.mockReturnValue({ id: '27' })
  })

  it('names the pet, the ask and the place', async () => {
    serveRequest()
    renderWithRouter(<PlacementPosterPage />)

    expect(await screen.findByRole('heading', { name: /Minnie needs a home/i })).toBeInTheDocument()
    expect(screen.getByText('Nha Trang, VN')).toBeInTheDocument()
  })

  it('shows the QR and the listing URL beside it', async () => {
    serveRequest()
    renderWithRouter(<PlacementPosterPage />)

    // The URL in plain text matters as much as the code: a QR that will not
    // scan in bad light still leaves something a person can type.
    await waitFor(() => {
      expect(screen.getByText(`${window.location.origin}/requests/27`)).toBeInTheDocument()
    })

    const qr = await screen.findByAltText(/QR code for Minnie/i)
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,mock-qr-code')
  })

  it('offers a print button that the printed sheet does not carry', async () => {
    serveRequest()
    renderWithRouter(<PlacementPosterPage />)

    const button = await screen.findByRole('button', { name: /print poster/i })
    expect(button.closest('.print\\:hidden')).not.toBeNull()
  })

  it('renders without a photo rather than leaving a broken image', async () => {
    serveRequest({
      pet: { id: 1, name: 'Len', photo_url: null, city: 'Nha Trang', country: 'VN' },
    })
    renderWithRouter(<PlacementPosterPage />)

    expect(await screen.findByRole('heading', { name: /Len needs a home/i })).toBeInTheDocument()
    expect(screen.queryByAltText('Len')).not.toBeInTheDocument()
  })

  it('uses foster wording for a foster request', async () => {
    serveRequest({ request_type: 'foster_free' })
    renderWithRouter(<PlacementPosterPage />)

    expect(
      await screen.findByRole('heading', { name: /Minnie needs a foster home/i })
    ).toBeInTheDocument()
  })

  it('reports a bad id instead of requesting it', async () => {
    mockUseParams.mockReturnValue({ id: 'not-a-number' })
    renderWithRouter(<PlacementPosterPage />)

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })
})
