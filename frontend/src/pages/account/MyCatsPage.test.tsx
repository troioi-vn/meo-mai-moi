import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { setupServer } from 'msw/node'
import MyCatsPage from './MyCatsPage'
import { getMyCats } from '@/api/cats'
import { useAuth } from '@/hooks/use-auth'

vi.mock('@/api/cats')
vi.mock('@/hooks/use-auth')

const server = setupServer()

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' }

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('MyCatsPage', () => {
  beforeAll(() => {
    server.listen()
  })
  afterEach(() => {
    server.resetHandlers()
  })
  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false,
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })
  })

  it('renders the page title', async () => {
    vi.mocked(getMyCats).mockResolvedValue([])
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      expect(screen.getByText('My Cats')).toBeInTheDocument()
    })
  })

  it("fetches and displays the user's cats", async () => {
    vi.mocked(getMyCats).mockResolvedValue([
      {
        id: 1,
        name: 'Cat 1',
        breed: 'Breed 1',
        birthday: '2020-01-01',
        location: 'Location 1',
        description: 'Description 1',
        user_id: 1,
        status: 'available',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        imageUrl: 'http://example.com/cat1.jpg',
      },
      {
        id: 2,
        name: 'Cat 2',
        breed: 'Breed 2',
        birthday: '2021-01-01',
        location: 'Location 2',
        description: 'Description 2',
        user_id: 1,
        status: 'fostered',
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        imageUrl: 'http://example.com/cat2.jpg',
      },
    ])
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      expect(screen.getByText('Cat 1')).toBeInTheDocument()
      expect(screen.getByText('Cat 2')).toBeInTheDocument()
    })
  })

  it('displays a loading message initially', async () => {
    vi.mocked(getMyCats).mockResolvedValue([])
    renderWithRouter(<MyCatsPage />)
    expect(screen.getByText('Loading your cats...')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Loading your cats...')).not.toBeInTheDocument()
    })
  })

  it('displays an error message if fetching cats fails', async () => {
    vi.mocked(getMyCats).mockRejectedValue(new Error('Failed to fetch'))
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      expect(
        screen.getByText('Failed to fetch your cats. Please try again later.')
      ).toBeInTheDocument()
    })
  })

  it('has a button to create a new cat', async () => {
    vi.mocked(getMyCats).mockResolvedValue([])
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /new cat/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('Show All Switch', () => {
    it('renders the switch to show all cats including deceased', async () => {
      vi.mocked(getMyCats).mockResolvedValue([])
      renderWithRouter(<MyCatsPage />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
        expect(screen.getByText('Show all (including deceased)')).toBeInTheDocument()
      })
    })

    it('filters out dead cats by default', async () => {
      vi.mocked(getMyCats).mockResolvedValue([
        {
          id: 1,
          name: 'Alive Cat',
          breed: 'Breed 1',
          birthday: '2020-01-01',
          location: 'Location 1',
          description: 'Description 1',
          user_id: 1,
          status: 'available',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Dead Cat',
          breed: 'Breed 2',
          birthday: '2021-01-01',
          location: 'Location 2',
          description: 'Description 2',
          user_id: 1,
          status: 'dead',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ])

      renderWithRouter(<MyCatsPage />)

      await waitFor(() => {
        expect(screen.getByText('Alive Cat')).toBeInTheDocument()
        expect(screen.queryByText('Dead Cat')).not.toBeInTheDocument()
      })
    })

    it('shows dead cats when switch is toggled on', async () => {
      const user = userEvent.setup()
      vi.mocked(getMyCats).mockResolvedValue([
        {
          id: 1,
          name: 'Alive Cat',
          breed: 'Breed 1',
          birthday: '2020-01-01',
          location: 'Location 1',
          description: 'Description 1',
          user_id: 1,
          status: 'available',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Dead Cat',
          breed: 'Breed 2',
          birthday: '2021-01-01',
          location: 'Location 2',
          description: 'Description 2',
          user_id: 1,
          status: 'dead',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ])

      renderWithRouter(<MyCatsPage />)

      // Initially dead cat should not be visible
      await waitFor(() => {
        expect(screen.getByText('Alive Cat')).toBeInTheDocument()
        expect(screen.queryByText('Dead Cat')).not.toBeInTheDocument()
      })

      // Toggle the switch
      const switchElement = screen.getByRole('switch')
      await user.click(switchElement)

      // Now dead cat should be visible
      await waitFor(() => {
        expect(screen.getByText('Alive Cat')).toBeInTheDocument()
        expect(screen.getByText('Dead Cat')).toBeInTheDocument()
      })
    })
  })
})
