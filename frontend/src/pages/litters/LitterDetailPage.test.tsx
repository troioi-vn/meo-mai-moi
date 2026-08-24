import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import LitterDetailPage from './LitterDetailPage'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'
import type { Litter, Pet as ApiPet } from '@/api/generated/model'
import type { Pet } from '@/types/pet'
import { mockPet } from '@/testing/mocks/data/pets'

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' } as never

function makePet(id: number, name: string, sex: Pet['sex'] = 'not_specified'): ApiPet {
  return {
    ...mockPet,
    id,
    name,
    sex,
    photo_url: null,
    pet_type_id: 1,
  } as unknown as ApiPet
}

function makeLitter(pets: ApiPet[], overrides: Partial<Litter> = {}): Litter {
  return {
    id: 10,
    name: 'Sunny Litter',
    pet_type_id: 1,
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pet_type: {
      id: 1,
      name: 'Cat',
      slug: 'cat',
      description: '',
      is_active: true,
      is_system: true,
      display_order: 1,
      placement_requests_allowed: true,
    },
    pets,
    ...overrides,
  }
}

let litterStore: Litter | null = null
let putCalls: { id: number; body: unknown }[] = []

function setupHandlers(initial: Litter | null) {
  litterStore = initial ? JSON.parse(JSON.stringify(initial)) : null
  putCalls = []

  server.use(
    http.get('http://localhost:3000/api/litters/:litterId', ({ params }) => {
      const id = Number(params.litterId)
      if (!litterStore || litterStore.id !== id) {
        return new HttpResponse(null, { status: 404 })
      }
      return HttpResponse.json({ data: litterStore })
    }),
    http.put('http://localhost:3000/api/pets/:id', async ({ params, request }) => {
      const id = Number(params.id)
      const body = (await request.json()) as Pet
      putCalls.push({ id, body })
      if (litterStore?.pets) {
        const idx = litterStore.pets.findIndex((p) => p.id === id)
        const existing = litterStore.pets[idx]
        if (existing) {
          litterStore.pets[idx] = { ...existing, name: body.name }
        }
      }
      return HttpResponse.json({ data: { ...mockPet, ...body } })
    }),
    http.delete('http://localhost:3000/api/litters/:litter/members/:pet', ({ params }) => {
      const litterId = Number(params.litter)
      const petId = Number(params.pet)
      if (!litterStore || litterStore.id !== litterId) {
        return new HttpResponse(null, { status: 404 })
      }
      const pets = litterStore.pets ?? []
      const exists = pets.some((p) => p.id === petId)
      if (!exists) {
        return HttpResponse.json({ message: 'Not member' }, { status: 422 })
      }
      // Backend rule: if litter would be left with <2, delete litter entirely
      if (pets.length === 2) {
        litterStore = null
      } else {
        litterStore = { ...litterStore, pets: pets.filter((p) => p.id !== petId) }
      }
      return new HttpResponse(null, { status: 204 })
    }),
    http.post('http://localhost:3000/api/litters/:litter/split-up', ({ params }) => {
      const litterId = Number(params.litter)
      if (!litterStore || litterStore.id !== litterId) {
        return new HttpResponse(null, { status: 404 })
      }
      litterStore = null
      return new HttpResponse(null, { status: 204 })
    })
  )
}

describe('LitterDetailPage', () => {
  beforeEach(() => {
    putCalls = []
    // Mock myself as authenticated
    // server handlers reset happens in global afterEach, but we set per test
  })

  it('shows litter name and every member with avatar, name and sex', async () => {
    const litter = makeLitter([
      makePet(101, 'Milo', 'male'),
      makePet(102, 'Luna', 'female'),
      makePet(103, 'Kit', 'not_specified'),
    ])
    setupHandlers(litter)

    renderWithRouter(<LitterDetailPage />, {
      route: '/litters/10',
      routes: [{ path: '/litters/:id', element: <LitterDetailPage /> }],
      initialAuthState: { isAuthenticated: true, user: mockUser },
    })

    await waitFor(() => expect(screen.getByTestId('litter-name')).toBeInTheDocument())
    expect(screen.getByTestId('litter-name')).toHaveTextContent('Sunny Litter')
    // members
    expect(screen.getByTestId('litter-member-101')).toBeInTheDocument()
    expect(screen.getByTestId('litter-member-102')).toBeInTheDocument()
    expect(screen.getByTestId('litter-member-103')).toBeInTheDocument()

    expect(screen.getByTestId('member-link-101')).toHaveTextContent('Milo')
    expect(screen.getByTestId('member-sex-101')).toHaveTextContent('Male')
    expect(screen.getByTestId('member-sex-102')).toHaveTextContent('Female')
    // links
    expect(screen.getByTestId('member-link-101')).toHaveAttribute('href', '/pets/101')
    expect(screen.getByTestId('member-link-102')).toHaveAttribute('href', '/pets/102')
  })

  it('member can be renamed inline and new name visible without reload', async () => {
    const litter = makeLitter([makePet(101, 'Milo', 'male'), makePet(102, 'Luna', 'female')])
    setupHandlers(litter)

    const { user } = renderWithRouter(<LitterDetailPage />, {
      route: '/litters/10',
      routes: [{ path: '/litters/:id', element: <LitterDetailPage /> }],
      initialAuthState: { isAuthenticated: true, user: mockUser },
    })

    await waitFor(() => expect(screen.getByTestId('litter-member-101')).toBeInTheDocument())

    await user.click(screen.getByTestId('rename-btn-101'))
    const input = screen.getByTestId('rename-input-101')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('Milo')
    await user.clear(input)
    await user.type(input, 'Simba')
    await user.click(screen.getByTestId('rename-save-101'))

    await waitFor(() => {
      expect(putCalls.length).toBe(1)
    })
    expect(putCalls[0]!.body).toMatchObject({ name: 'Simba' })

    // After invalidate, new name should appear
    await waitFor(() => expect(screen.getByTestId('member-link-101')).toHaveTextContent('Simba'))
  })

  it('member can be separated and list updates', async () => {
    const litter = makeLitter([
      makePet(101, 'Milo', 'male'),
      makePet(102, 'Luna', 'female'),
      makePet(103, 'Kit', 'female'),
    ])
    setupHandlers(litter)

    const { user } = renderWithRouter(<LitterDetailPage />, {
      route: '/litters/10',
      routes: [{ path: '/litters/:id', element: <LitterDetailPage /> }],
      initialAuthState: { isAuthenticated: true, user: mockUser },
    })

    await waitFor(() => expect(screen.getByTestId('litter-member-101')).toBeInTheDocument())
    expect(screen.getByTestId('litter-member-count')).toHaveTextContent('3')

    await user.click(screen.getByTestId('separate-btn-101'))

    await waitFor(() => expect(screen.queryByTestId('litter-member-101')).not.toBeInTheDocument())
    expect(screen.getByTestId('litter-member-count')).toHaveTextContent('2')
    expect(screen.getByTestId('litter-member-102')).toBeInTheDocument()
  })

  it('splitting up requires confirmation that states no pets are deleted', async () => {
    const litter = makeLitter([makePet(101, 'Milo'), makePet(102, 'Luna')])
    setupHandlers(litter)

    const { user } = renderWithRouter(<LitterDetailPage />, {
      route: '/litters/10',
      routes: [{ path: '/litters/:id', element: <LitterDetailPage /> }],
      initialAuthState: { isAuthenticated: true, user: mockUser },
    })

    await waitFor(() => expect(screen.getByTestId('split-up-btn')).toBeInTheDocument())

    await user.click(screen.getByTestId('split-up-btn'))

    const dialog = await screen.findByTestId('split-up-dialog')
    expect(dialog).toBeInTheDocument()
    // Confirmation must say plainly no pets are deleted
    expect(dialog).toHaveTextContent(/No pets will be deleted/i)
    expect(dialog).toHaveTextContent(/No pets are deleted|No pets will be deleted/i)
    expect(screen.getByTestId('split-up-confirm')).toBeInTheDocument()
    expect(screen.getByTestId('split-up-cancel')).toBeInTheDocument()
    // Cancel should close without splitting
    await user.click(screen.getByTestId('split-up-cancel'))
    await waitFor(() => expect(screen.queryByTestId('split-up-dialog')).not.toBeInTheDocument())
    // litter still there
    expect(screen.getByTestId('litter-name')).toBeInTheDocument()
  })

  it('dissolves litter on split up and navigates away', async () => {
    const litter = makeLitter([makePet(101, 'Milo'), makePet(102, 'Luna'), makePet(103, 'Kit')])
    setupHandlers(litter)

    const { user } = renderWithRouter(<LitterDetailPage />, {
      route: '/litters/10',
      routes: [
        { path: '/litters/:id', element: <LitterDetailPage /> },
        { path: '/', element: <div data-testid="home-page">Home</div> },
      ],
      initialAuthState: { isAuthenticated: true, user: mockUser },
    })

    await waitFor(() => expect(screen.getByTestId('split-up-btn')).toBeInTheDocument())
    await user.click(screen.getByTestId('split-up-btn'))
    await screen.findByTestId('split-up-dialog')
    await user.click(screen.getByTestId('split-up-confirm'))

    await waitFor(() => expect(screen.getByTestId('home-page')).toBeInTheDocument())
    expect(screen.queryByTestId('litter-name')).not.toBeInTheDocument()
  })

  it('separating from a two-member litter dissolves and navigates away', async () => {
    const litter = makeLitter([makePet(101, 'Milo'), makePet(102, 'Luna')])
    setupHandlers(litter)

    const { user } = renderWithRouter(<LitterDetailPage />, {
      route: '/litters/10',
      routes: [
        { path: '/litters/:id', element: <LitterDetailPage /> },
        { path: '/', element: <div data-testid="home-page">Home</div> },
      ],
      initialAuthState: { isAuthenticated: true, user: mockUser },
    })

    await waitFor(() => expect(screen.getByTestId('separate-btn-101')).toBeInTheDocument())
    await user.click(screen.getByTestId('separate-btn-101'))
    await user.click(await screen.findByTestId('separate-confirm'))

    await waitFor(() => expect(screen.getByTestId('home-page')).toBeInTheDocument())
    expect(screen.queryByTestId('litter-name')).not.toBeInTheDocument()
  })

  it('shows loading and error states', async () => {
    // loading state
    setupHandlers(null)
    // Override GET to delay
    server.use(
      http.get('http://localhost:3000/api/litters/:litterId', async () => {
        await new Promise((r) => setTimeout(r, 200))
        return new HttpResponse(null, { status: 404 })
      })
    )

    renderWithRouter(<LitterDetailPage />, {
      route: '/litters/999',
      routes: [{ path: '/litters/:id', element: <LitterDetailPage /> }],
      initialAuthState: { isAuthenticated: true, user: mockUser },
    })

    // Initially loading
    expect(await screen.findByTestId('loading-spinner')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Litter not found/i)).toBeInTheDocument(), {
      timeout: 2000,
    })
  })
})
