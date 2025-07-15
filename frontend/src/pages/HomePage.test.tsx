import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import HomePage from './HomePage'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('HomePage', () => {
  it('renders the hero section', () => {
    renderWithRouter(<HomePage />)
    
    const heroHeading = screen.getByRole('heading', { level: 1 })
    expect(heroHeading).toBeInTheDocument()
    expect(heroHeading).toHaveTextContent('Find Your New Best Friend')
  })

  it('renders the hero section description', () => {
    renderWithRouter(<HomePage />)
    
    const description = screen.getByText(/connecting loving homes with cats in need/i)
    expect(description).toBeInTheDocument()
  })

  it('has login and register action buttons', () => {
    renderWithRouter(<HomePage />)
    
    const loginLink = screen.getByRole('link', { name: 'Login' })
    const registerLink = screen.getByRole('link', { name: 'Register' })
    
    expect(loginLink).toBeInTheDocument()
    expect(registerLink).toBeInTheDocument()
  })

  it('has correct navigation links', () => {
    renderWithRouter(<HomePage />)
    
    const loginLink = screen.getByRole('link', { name: 'Login' })
    const registerLink = screen.getByRole('link', { name: 'Register' })
    
    expect(loginLink).toHaveAttribute('href', '/login')
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('applies proper layout and styling classes', () => {
    renderWithRouter(<HomePage />)
    
    const container = document.querySelector('.min-h-screen')
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass(
      'min-h-screen',
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'bg-gray-100',
      'dark:bg-gray-900',
      'text-gray-900',
      'dark:text-gray-100'
    )
  })

  it('has action buttons with proper styling', () => {
    renderWithRouter(<HomePage />)
    
    const loginButton = screen.getByRole('link', { name: 'Login' }).querySelector('button')
    const registerButton = screen.getByRole('link', { name: 'Register' }).querySelector('button')
    
    expect(loginButton).toBeInTheDocument()
    expect(registerButton).toBeInTheDocument()
  })

  it('has properly spaced action buttons', () => {
    renderWithRouter(<HomePage />)
    
    const buttonContainer = document.querySelector('.flex.justify-center.space-x-4')
    expect(buttonContainer).toBeInTheDocument()
    expect(buttonContainer).toHaveClass('flex', 'justify-center', 'space-x-4', 'mt-8')
  })

  it('renders as a complete landing page', () => {
    renderWithRouter(<HomePage />)
    
    // Check that all key elements for a landing page are present
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/connecting loving homes/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument()
  })
})
