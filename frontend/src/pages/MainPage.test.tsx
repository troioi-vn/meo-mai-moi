import { screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import MainPage from '../pages/MainPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

vi.mock('@/components/HeroSection', () => ({ HeroSection: () => <section>Hero Section</section> }))
vi.mock('@/components/CatsSection', () => ({ CatsSection: () => <section>Cats Section</section> }))
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Footer</footer> }))

describe('MainPage', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
        })
      }),
    )
  })

  it('renders all the main sections', () => {
    renderWithRouter(<MainPage />)
    expect(screen.getByText('Hero Section')).toBeInTheDocument()
    expect(screen.getByText('Cats Section')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
