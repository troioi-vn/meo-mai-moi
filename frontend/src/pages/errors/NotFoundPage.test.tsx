import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from '@/testing'

import { AppRoutes } from '@/App'

describe('NotFoundPage', () => {
  // Render NotFoundPage via router for a non-existent route
  const render404 = () => renderWithRouter(<AppRoutes />, { route: '/some/bad/route' })

  it('renders the 404 error number', async () => {
    render404()
    await waitFor(() => {
      const errorCode = screen.getByText('404')
      expect(errorCode).toBeInTheDocument()
      expect(errorCode).toHaveClass('text-9xl', 'font-bold', 'text-primary')
    })
  })

  it('renders the page not found heading', async () => {
    render404()
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
    })
  })

  it('has a link to return to homepage', () => {
    render404()
    const homeLink = screen.getByRole('link')
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('has proper text styling for different elements', () => {
    render404()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('mt-4', 'text-2xl', 'font-semibold', 'text-foreground')
  })

  it('renders NotFoundPage for unknown routes via router', () => {
    renderWithRouter(<AppRoutes />, { route: '/definitely-not-a-real-page' })
    expect(screen.getByText('404')).toBeInTheDocument()
  })
})
