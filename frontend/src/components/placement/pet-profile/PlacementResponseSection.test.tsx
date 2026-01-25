import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import { PlacementResponseSection } from './PlacementResponseSection'

describe('PlacementResponseSection', () => {
  it('navigates to /requests/:id when user clicks "Respond to Placement Request"', () => {
    renderWithRouter(
      <PlacementResponseSection
        pet={
          {
            id: 1,
            name: 'Fluffy',
            city: 'Hanoi',
            country: 'VN',
          } as any
        }
        activePlacementRequest={
          {
            id: 123,
            request_type: 'foster_free',
            status: 'open',
            user_id: 999,
          } as any
        }
        onRefresh={vi.fn()}
      />,
      {
        route: '/pets/1/view',
        initialAuthState: {
          user: { id: 555, name: 'Tester', email: 'tester@example.com' } as any,
          isLoading: false,
          isAuthenticated: true,
        },
      }
    )

    const link = screen.getByRole('link', { name: /respond to placement request/i })
    expect(link).toHaveAttribute('href', '/requests/123')
  })
})
