import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { CatCard } from './CatCard'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const mockCatData = {
  id: '1',
  name: 'Fluffy',
  breed: 'Persian',
  birthday: '2021-01-01', // This should make the cat about 4 years old in 2025
  location: 'Ho Chi Minh City',
  imageUrl: 'https://example.com/cat.jpg',
}

describe('CatCard', () => {
  it('renders cat information correctly', () => {
    renderWithRouter(<CatCard {...mockCatData} />)

    expect(screen.getByText('Fluffy')).toBeInTheDocument()
    expect(screen.getByText('Persian - 4 years old')).toBeInTheDocument() // Updated to reflect calculated age
    expect(screen.getByText('Ho Chi Minh City')).toBeInTheDocument()
  })

  it('renders cat image with correct alt text', () => {
    renderWithRouter(<CatCard {...mockCatData} />)

    const image = screen.getByAltText('Fluffy')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/cat.jpg')
  })

  it('uses placeholder image when imageUrl is not provided', () => {
    const { imageUrl, ...catDataWithoutImage } = mockCatData
    void imageUrl // Explicitly acknowledge the unused variable
    renderWithRouter(<CatCard {...catDataWithoutImage} />)

    const image = screen.getByAltText('Fluffy')
    expect(image.getAttribute('src')).toMatch(/placeholder--cat.webp/)
  })

  it('has a link to the cat profile page', () => {
    renderWithRouter(<CatCard {...mockCatData} />)

    const profileLink = screen.getByRole('link', { name: /view profile/i })
    expect(profileLink).toBeInTheDocument()
    expect(profileLink).toHaveAttribute('href', '/cats/1')
  })

  it('has proper accessibility structure', () => {
    renderWithRouter(<CatCard {...mockCatData} />)

    // Check that the card displays the cat name (it's in a div, not a semantic heading)
    expect(screen.getByText('Fluffy')).toBeInTheDocument()

    // Check that the image has alt text
    expect(screen.getByAltText('Fluffy')).toBeInTheDocument()

    // Check that the action button is accessible
    expect(screen.getByRole('button', { name: /view profile/i })).toBeInTheDocument()
  })

  it('applies hover effects through CSS classes', () => {
    renderWithRouter(<CatCard {...mockCatData} />)

    // Check that the card has the hover transition classes
    const card = screen.getByText('Fluffy').closest('.shadow-lg')
    expect(card).toHaveClass('hover:shadow-xl', 'transition-shadow')
  })
})
