import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import NotFoundPage from './NotFoundPage'
import { AppRoutes } from '@/App'

describe('NotFoundPage', () => {
  // Render NotFoundPage via router for a non-existent route
  const render404 = () => renderWithRouter(<AppRoutes />, { route: '/some/bad/route' })

  it('renders the 404 error number', () => {
    render404()
    const errorCode = screen.getByText('404')
    expect(errorCode).toBeInTheDocument()
    expect(errorCode).toHaveClass('text-9xl', 'font-bold', 'text-primary')
  })

  it('renders the page not found heading', () => {
    render404()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Page Not Found')
  })

  it('renders the explanatory message', () => {
    render404()
    const message = screen.getByText('The page you are looking for does not exist.')
    expect(message).toBeInTheDocument()
  })

  it('has a link to return to homepage', () => {
    render404()
    const homeLink = screen.getByRole('link', { name: /go to homepage/i })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('applies proper styling for centering and layout', () => {
    render404()
    const container = document.querySelector(
      '.flex.flex-col.items-center.justify-center.min-h-screen'
    )
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'min-h-screen',
      'text-center',
      'bg-background'
    )
  })

  it('has proper text styling for different elements', () => {
    render404()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('mt-4', 'text-2xl', 'font-semibold', 'text-foreground')
    const message = screen.getByText('The page you are looking for does not exist.')
    expect(message).toHaveClass('mt-2', 'text-muted-foreground')
  })

  it('renders NotFoundPage for unknown routes via router', () => {
    renderWithRouter(<AppRoutes />, { route: '/definitely-not-a-real-page' })
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Page Not Found')
  })
})
