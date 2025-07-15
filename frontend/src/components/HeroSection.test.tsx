import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HeroSection } from './HeroSection'

describe('HeroSection', () => {
  it('renders the main heading', () => {
    render(<HeroSection />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Find Your New Best Friend')
  })

  it('renders the descriptive text', () => {
    render(<HeroSection />)
    
    const description = screen.getByText(/connecting loving homes with cats in need/i)
    expect(description).toBeInTheDocument()
    expect(description).toHaveTextContent(
      'Connecting loving homes with cats in need. Meo Mai Moi helps you find, foster, or adopt a cat in your community.'
    )
  })

  it('has proper semantic structure', () => {
    render(<HeroSection />)
    
    // Check that it's a section element
    const sectionElement = document.querySelector('section')
    expect(sectionElement).toBeInTheDocument()
  })

  it('applies responsive styling classes', () => {
    render(<HeroSection />)
    
    const section = document.querySelector('section')
    expect(section).toHaveClass('w-full', 'py-12', 'md:py-24', 'lg:py-32')
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('text-3xl', 'font-bold', 'tracking-tighter', 'sm:text-5xl')
    
    const description = screen.getByText(/connecting loving homes/i)
    expect(description).toHaveClass('max-w-[600px]', 'mt-4', 'md:text-xl')
  })

  it('has proper container structure', () => {
    render(<HeroSection />)
    
    const container = document.querySelector('.container')
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass('mx-auto', 'px-4', 'md:px-6')
  })
})
