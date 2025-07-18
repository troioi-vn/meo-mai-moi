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

  it('has centered heading with proper styling', () => {
    renderWithRouter(<CatsSection />)

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('text-3xl', 'font-bold', 'tracking-tighter', 'text-center', 'mb-8')
  })
})
