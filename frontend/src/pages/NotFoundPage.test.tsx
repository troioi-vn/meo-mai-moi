import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import NotFoundPage from './NotFoundPage'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('NotFoundPage', () => {
  it('renders the 404 error number', () => {
    renderWithRouter(<NotFoundPage />)
    
    const errorCode = screen.getByText('404')
    expect(errorCode).toBeInTheDocument()
    expect(errorCode).toHaveClass('text-9xl', 'font-bold', 'text-primary')
  })

  it('renders the page not found heading', () => {
    renderWithRouter(<NotFoundPage />)
    
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Page Not Found')
  })

  it('renders the explanatory message', () => {
    renderWithRouter(<NotFoundPage />)
    
    const message = screen.getByText('The page you are looking for does not exist.')
    expect(message).toBeInTheDocument()
  })

  it('has a link to return to homepage', () => {
    renderWithRouter(<NotFoundPage />)
    
    const homeLink = screen.getByRole('link', { name: /go to homepage/i })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('applies proper styling for centering and layout', () => {
    renderWithRouter(<NotFoundPage />)
    
    const container = document.querySelector('.flex.flex-col.items-center.justify-center.min-h-screen')
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'min-h-screen',
      'text-center',
      'bg-neutral-100',
      'dark:bg-neutral-900'
    )
  })

  it('has proper text styling for different elements', () => {
    renderWithRouter(<NotFoundPage />)
    
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('mt-4', 'text-2xl', 'font-semibold', 'text-neutral-900', 'dark:text-neutral-100')
    
    const message = screen.getByText('The page you are looking for does not exist.')
    expect(message).toHaveClass('mt-2', 'text-neutral-700', 'dark:text-neutral-300')
  })
})
