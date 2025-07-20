import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { CatsSection } from './CatsSection'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { mockCat } from '@/mocks/data/cats'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('CatsSection', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/cats', () => {
        return HttpResponse.json({ data: [mockCat] })
      }),
    )
  })

  it('renders the section heading', async () => {
    renderWithRouter(<CatsSection />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Cats Looking for Homes Now')
  })

  it('has centered heading with proper styling', async () => {
    renderWithRouter(<CatsSection />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('text-3xl', 'font-bold', 'tracking-tighter', 'text-center', 'mb-8')
  })

  it('displays a loading message initially', () => {
    server.use(
      http.get('http://localhost:3000/api/cats', () => {
        return new Promise(() => { /* intentionally empty to simulate loading */ })
      }),
    )
    renderWithRouter(<CatsSection />)
    expect(screen.getByText('Loading cats...')).toBeInTheDocument()
  })

  it('displays an error message if fetching cats fails', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )
    renderWithRouter(<CatsSection />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load cats.')).toBeInTheDocument()
    })
  })

  it('renders cat cards after loading', async () => {
    renderWithRouter(<CatsSection />)
    await waitFor(() => {
      expect(screen.getByText(mockCat.name)).toBeInTheDocument()
    })
  })
})
