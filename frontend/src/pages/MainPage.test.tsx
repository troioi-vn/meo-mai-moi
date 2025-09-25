import { screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import MainPage from '../pages/MainPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { testScenarios } from '@/mocks/data/pets'

// Mock HeroSection and Footer to focus on integration testing
vi.mock('@/components/HeroSection', () => ({
  HeroSection: () => <section data-testid="hero-section">Hero Section</section>,
}))
vi.mock('@/components/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}))

describe('MainPage Integration Tests', () => {
  beforeEach(() => {
    // Mock user authentication
    server.use(
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
        })
      })
    )
  })

  describe('Component Structure and Layout', () => {
    it('renders all main sections in correct order', async () => {
      // Use scenario with some cats to test full layout
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.four })
        })
      )

      renderWithRouter(<MainPage />)

      // Wait for all sections to load
      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument()
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
        expect(screen.getByTestId('footer')).toBeInTheDocument()
      })

      // Verify component ordering by checking DOM structure
      const main = screen.getByRole('main')
      const sections = within(main).getAllByRole('generic')

      // HeroSection should come first, then ActivePlacementRequestsSection
      expect(sections[0]).toHaveAttribute('data-testid', 'hero-section')
      expect(sections[1]).toHaveTextContent('Active Placement Requests')
    })

    it('maintains responsive layout structure', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.four })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      })

      // Check main layout classes for responsive design
      const mainElement = screen.getByRole('main')
      expect(mainElement).toHaveClass('flex-1')

      // Check that the page container has proper flex layout
      const pageContainer = mainElement.parentElement
      expect(pageContainer).toHaveClass('flex', 'flex-col', 'min-h-screen', 'bg-background')
    })
  })

  describe('ActivePlacementRequestsSection Integration', () => {
    it('renders ActivePlacementRequestsSection correctly within MainPage', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.four })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      })

      // Verify section title is rendered
      expect(screen.getByRole('heading', { name: 'Active Placement Requests' })).toBeInTheDocument()

      // Verify pet cards are rendered (should be 4 pets)
      const petCards = screen.getAllByText(/Fluffy|Whiskers|Luna|Mittens/)
      expect(petCards).toHaveLength(4)

      // Verify no "Show more" button for 4 pets
      expect(screen.queryByText('View All Requests')).not.toBeInTheDocument()
    })

    it('displays show more button when there are more than 4 pets', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.fivePlus })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      })

      // Should only show first 4 pets
      const catCards = screen.getAllByText(/Fluffy|Whiskers|Luna|Mittens/)
      expect(catCards).toHaveLength(4)

      // Should show "Show more" button
      expect(screen.getByText('View All Requests')).toBeInTheDocument()
    })

    it('handles empty state correctly', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.empty })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      })

      // Should show empty state message
      expect(screen.getByText('No active placement requests at the moment.')).toBeInTheDocument()
      expect(screen.getByText('Check back soon for pets needing help!')).toBeInTheDocument()

      // Should show paw emoji
      expect(screen.getByText('🐾')).toBeInTheDocument()
    })

    it('handles loading state correctly', async () => {
      // Create a delayed response to test loading state
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return HttpResponse.json({ data: testScenarios.four })
        })
      )

      renderWithRouter(<MainPage />)

      // Should show loading skeletons initially
      expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(screen.getByText('Fluffy')).toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })

    it('handles error state correctly', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return new HttpResponse(null, { status: 500 })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      })

      // Should show error message
      await waitFor(() => {
        expect(
          screen.getByText('Failed to load placement requests. Please try again later.')
        ).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })
  })

  describe('API Integration and Data Flow', () => {
    it('makes correct API call for placement requests', async () => {
      let apiCalled = false

      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          apiCalled = true
          return HttpResponse.json({ data: testScenarios.four })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      })

      // Verify API was called
      expect(apiCalled).toBe(true)
    })

    it('processes API response correctly and limits to 4 cats', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.fivePlus }) // 6 cats
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      })

      // Should only display first 4 cats
      expect(screen.getByText('Fluffy')).toBeInTheDocument()
      expect(screen.getByText('Whiskers')).toBeInTheDocument()
      expect(screen.getByText('Luna')).toBeInTheDocument()
      expect(screen.getByText('Mittens')).toBeInTheDocument()

      // Should not display 5th cat
      expect(screen.queryByText('Oreo')).not.toBeInTheDocument()

      // Should show "Show more" button
      expect(screen.getByText('View All Requests')).toBeInTheDocument()
    })

    it('navigates to requests page when show more button is clicked', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.fivePlus })
        })
      )

      const { user } = renderWithRouter(<MainPage />, {
        routes: [
          { path: '/requests', element: <div data-testid="requests-page">Requests Page</div> },
        ],
      })

      await waitFor(() => {
        expect(screen.getByText('View All Requests')).toBeInTheDocument()
      })

      // Click the show more button
      await user.click(screen.getByText('View All Requests'))

      // Should navigate to requests page
      await waitFor(() => {
        expect(screen.getByTestId('requests-page')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design and Cross-browser Compatibility', () => {
    it('maintains proper spacing and layout on different screen sizes', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.four })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      })

      // Check that the section has proper container classes for responsive design
      const section = screen.getByText('Active Placement Requests').closest('section')
      expect(section).toHaveClass('container', 'mx-auto', 'px-4', 'py-8')

      // Check that the grid has responsive classes
      const grid = section?.querySelector('.grid')
      expect(grid).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'md:grid-cols-3',
        'lg:grid-cols-4',
        'gap-6'
      )
    })

    it('handles different data scenarios consistently', async () => {
      // Test with single cat scenario
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.single })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument()
      })

      // Should not show "Show more" button for single cat
      expect(screen.queryByText('View All Requests')).not.toBeInTheDocument()
    })

    it('handles two cats scenario without show more button', async () => {
      // Test with two cats
      server.use(
        http.get('http://localhost:3000/api/pets/placement-requests', () => {
          return HttpResponse.json({ data: testScenarios.two })
        })
      )

      renderWithRouter(<MainPage />)

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument()
        expect(screen.getByText('Whiskers')).toBeInTheDocument()
      })

      // Should not show "Show more" button for two cats
      expect(screen.queryByText('View All Requests')).not.toBeInTheDocument()
    })
  })
})
