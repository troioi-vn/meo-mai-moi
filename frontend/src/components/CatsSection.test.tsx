import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { CatsSection } from './CatsSection'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('CatsSection', () => {
  it('renders the section heading', () => {
    renderWithRouter(<CatsSection />)

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Cats Looking for Homes Now')
  })

  it('renders all featured cats', () => {
    renderWithRouter(<CatsSection />)

    // Check that all 4 cats are rendered
    expect(screen.getByText('Whiskers')).toBeInTheDocument()
    expect(screen.getByText('Mittens')).toBeInTheDocument()
    expect(screen.getByText('Shadow')).toBeInTheDocument()
    expect(screen.getByText('Tiger')).toBeInTheDocument()
  })

  it('renders cat information correctly', () => {
    renderWithRouter(<CatsSection />)

    // Check specific cat details
    expect(screen.getByText('Siamese - 2 years old')).toBeInTheDocument()
    expect(screen.getByText('Persian - 4 years old')).toBeInTheDocument()
    expect(screen.getByText('Bombay - 1 years old')).toBeInTheDocument()
    expect(screen.getByText('Tabby - 3 years old')).toBeInTheDocument()
  })

  it('renders cat locations', () => {
    renderWithRouter(<CatsSection />)

    expect(screen.getByText('New York, NY')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument()
    expect(screen.getByText('Chicago, IL')).toBeInTheDocument()
    expect(screen.getByText('Houston, TX')).toBeInTheDocument()
  })

  it('has links to individual cat profiles', () => {
    renderWithRouter(<CatsSection />)

    const profileLinks = screen.getAllByRole('link', { name: /view profile/i })
    expect(profileLinks).toHaveLength(4)

    // Check that links point to correct cat profile pages
    expect(profileLinks[0]).toHaveAttribute('href', '/cats/1')
    expect(profileLinks[1]).toHaveAttribute('href', '/cats/2')
    expect(profileLinks[2]).toHaveAttribute('href', '/cats/3')
    expect(profileLinks[3]).toHaveAttribute('href', '/cats/4')
  })

  it('renders cat images with correct alt text', () => {
    renderWithRouter(<CatsSection />)

    expect(screen.getByAltText('Whiskers')).toBeInTheDocument()
    expect(screen.getByAltText('Mittens')).toBeInTheDocument()
    expect(screen.getByAltText('Shadow')).toBeInTheDocument()
    expect(screen.getByAltText('Tiger')).toBeInTheDocument()
  })

  it('has proper semantic structure', () => {
    renderWithRouter(<CatsSection />)

    // Check that it's a section element
    const sectionElement = document.querySelector('section')
    expect(sectionElement).toBeInTheDocument()
  })

  it('applies responsive grid layout classes', () => {
    renderWithRouter(<CatsSection />)

    const gridContainer = document.querySelector('.grid')
    expect(gridContainer).toBeInTheDocument()
    expect(gridContainer).toHaveClass(
      'grid',
      'grid-cols-1',
      'sm:grid-cols-2',
      'md:grid-cols-3',
      'lg:grid-cols-4',
      'gap-8'
    )
  })

  it('has centered heading with proper styling', () => {
    renderWithRouter(<CatsSection />)

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('text-3xl', 'font-bold', 'tracking-tighter', 'text-center', 'mb-8')
  })
})
