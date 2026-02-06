import { screen } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import { describe, expect, it } from 'vitest'
import type { PlacementRequestDetail } from '@/types/placement'
import { PetInformationCard } from './PetInformationCard'

describe('PetInformationCard', () => {
  it('renders a View Profile link to the pet public profile', () => {
    const request = {
      id: 1,
      pet_id: 123,
      request_type: 'permanent',
      status: 'open',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',

      response_count: 0,
      viewer_role: 'owner',
      available_actions: {
        can_respond: false,
        can_cancel_my_response: false,
        can_accept_responses: false,
        can_reject_responses: false,
        can_confirm_handover: false,
        can_finalize: false,
        can_delete_request: false,
      },

      pet: {
        id: 123,
        name: 'Milo',
        photo_url: null,
        pet_type: { id: 1, name: 'Cat', slug: 'cat' },
        state: 'CA',
        country: 'US',
      },

      notes: null,
    } satisfies PlacementRequestDetail

    renderWithRouter(<PetInformationCard request={request} petCity="San Francisco" />)

    const link = screen.getByRole('link', { name: /view profile/i })
    expect(link).toHaveAttribute('href', '/pets/123/view')
  })
})
