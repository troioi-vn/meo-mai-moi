import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { CatCard } from './CatCard'
import { useAuth } from '@/hooks/use-auth'
import { PlacementResponseModal } from '@/components/PlacementResponseModal'

// Mock the useAuth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

// Mock the PlacementResponseModal component
vi.mock('@/components/PlacementResponseModal', () => ({
  PlacementResponseModal: vi.fn(() => null), // Render nothing, but we can check if it's called
}))

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

import { mockCat } from '@/mocks/data/cats'

describe('CatCard', () => {
  beforeEach(() => {
    // Default mock for useAuth
    ;(useAuth as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      isAuthenticated: true,
      user: { id: 2, role: 'helper' }, // A different user than mockCat.user_id
    })
  })

  it('renders cat information correctly', () => {
    renderWithRouter(<CatCard cat={mockCat} />)

    expect(screen.getByText('Fluffy')).toBeInTheDocument()
    // This will now pass as the component calculates the age
    expect(screen.getByText(/Persian - \d+ years old/)).toBeInTheDocument()
    expect(screen.getByText(/New York, NY/)).toBeInTheDocument()
  })

  it('renders cat image with correct alt text', () => {
    renderWithRouter(<CatCard cat={mockCat} />)

    const image = screen.getByAltText('Fluffy')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', mockCat.photo_url)
  })

  it('uses placeholder image when photo_url is not provided', () => {
    const catDataWithoutImage = { ...mockCat, photo_url: undefined }
    renderWithRouter(<CatCard cat={catDataWithoutImage} />)

    const image = screen.getByAltText('Fluffy')
    expect(image.getAttribute('src')).toMatch(/placeholder--cat.webp/)
  })

  it('has a link to the cat profile page', () => {
    renderWithRouter(<CatCard cat={mockCat} />)

    const profileLink = screen.getByRole('link', { name: /fluffy/i })
    expect(profileLink).toBeInTheDocument()
    expect(profileLink).toHaveAttribute('href', '/cats/1')
  })

  it('has proper accessibility structure', () => {
    renderWithRouter(<CatCard cat={mockCat} />)

    // Check that the card displays the cat name (it's in a div, not a semantic heading)
    expect(screen.getByText('Fluffy')).toBeInTheDocument()

    // Check that the image has alt text
    expect(screen.getByAltText('Fluffy')).toBeInTheDocument()
  })

  it('applies hover effects through CSS classes', () => {
    renderWithRouter(<CatCard cat={mockCat} />)

    // Check that the card has the hover transition classes
    const card = screen.getByText('Fluffy').closest('.shadow-lg')
    expect(card).toHaveClass('hover:shadow-xl', 'transition-all')
  })

  // New tests for "Respond" button and modal
  it('does not render "Respond" button if not authenticated', () => {
  ;(useAuth as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({ isAuthenticated: false, user: null })
    renderWithRouter(<CatCard cat={{ ...mockCat, placement_request_active: true }} />)
    expect(screen.queryByRole('button', { name: /respond/i })).not.toBeInTheDocument()
  })

  it('does not render "Respond" button if user is the cat owner', () => {
  ;(useAuth as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({ isAuthenticated: true, user: { id: mockCat.user_id } })
    renderWithRouter(<CatCard cat={{ ...mockCat, placement_request_active: true }} />)
    expect(screen.queryByRole('button', { name: /respond/i })).not.toBeInTheDocument()
  })

  it('does not render "Respond" button if no active placement request', () => {
  ;(useAuth as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({ isAuthenticated: true, user: { id: 2 } })
    renderWithRouter(<CatCard cat={{ ...mockCat, placement_request_active: false }} />)
    expect(screen.queryByRole('button', { name: /respond/i })).not.toBeInTheDocument()
  })

  it('renders "Respond" button if authenticated, not owner, and active placement request', () => {
  ;(useAuth as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({ isAuthenticated: true, user: { id: 2 } })
    renderWithRouter(<CatCard cat={{ ...mockCat, placement_request_active: true }} />)
    expect(screen.getByRole('button', { name: /respond/i })).toBeInTheDocument()
  })

  it('opens PlacementResponseModal when "Respond" button is clicked', () => {
    ;(useAuth as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({ isAuthenticated: true, user: { id: 2 } })
    renderWithRouter(
      <CatCard
        cat={{
          ...mockCat,
          placement_request_active: true,
          placement_requests: [
            {
              id: 101,
              cat_id: mockCat.id,
              user_id: 999,
              request_type: 'fostering',
              status: 'open',
              notes: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_active: true,
            },
          ],
        }}
      />
    )

    const respondButton = screen.getByRole('button', { name: /respond/i })
    fireEvent.click(respondButton)

    const calls = (PlacementResponseModal as unknown as { mock: { calls: any[] } }).mock.calls
    const lastProps = calls[calls.length - 1]?.[0]
    expect(lastProps).toEqual(
      expect.objectContaining({
        isOpen: true,
        catName: mockCat.name,
        catId: mockCat.id,
        placementRequestId: 101,
      })
    )
  })
})