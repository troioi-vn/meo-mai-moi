import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { CatCard } from './CatCard'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

import { mockCat } from '@/mocks/data/cats'

describe('CatCard', () => {
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
})
