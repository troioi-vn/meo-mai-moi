import { useEffect } from 'react'
import { afterEach, expect, it } from 'vite-plus/test'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/use-auth'
import { queryClient } from '@/lib/query-cache'
import { server } from '@/testing/mocks/server'
import { PlacementPosterPage } from './PlacementPosterPage'

function AuthStatus() {
  const { status } = useAuth()
  return <output data-testid="bootstrap-status">{status}</output>
}

afterEach(() => {
  queryClient.clear()
})

it.each([false, true])(
  'waits for guest bootstrap cache cleanup without duplicate GETs, persisted cache: %s',
  async (persisted) => {
    queryClient.clear()
    let finishAuth: () => void = () => {}
    const authGate = new Promise<void>((resolve) => {
      finishAuth = resolve
    })
    let authCalls = 0
    let requestCalls = 0
    let petCalls = 0
    server.use(
      http.get('http://localhost:3000/api/users/me', async () => {
        authCalls++
        await authGate
        return HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 })
      }),
      http.get('http://localhost:3000/api/placement-requests/27', () => {
        requestCalls++
        return HttpResponse.json({
          data: {
            id: 27,
            pet_id: 1,
            status: 'open',
            request_type: 'permanent',
            notes: '',
            pet: { id: 1, name: 'Minnie' },
            available_actions: { can_print_poster: false },
          },
        })
      }),
      http.get('http://localhost:3000/api/pets/1', () => {
        petCalls++
        return HttpResponse.json({
          data: {
            id: 1,
            photos: [{ id: 10, medium_url: '/medium.jpg', url: '/display.jpg', is_primary: true }],
          },
        })
      })
    )
    if (persisted) {
      queryClient.setQueryData(['placement-poster', 27, 'en'], {
        id: 27,
        pet_id: 1,
        status: 'open',
        request_type: 'permanent',
        notes: '',
        pet: { id: 1, name: 'Minnie' },
        available_actions: { can_print_poster: false },
      })
      queryClient.setQueryData(['poster-pet', 1, 'en'], {
        id: 1,
        photos: [{ id: 10, medium_url: '/medium.jpg', url: '/display.jpg', is_primary: true }],
      })
    }
    render(
      <MemoryRouter
        initialEntries={['/requests/27/poster?lang=en&paper=letter&tabs=0&photo=10&focus=50,10']}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthStatus />
            <Routes>
              <Route path="/requests/:id/poster" element={<PlacementPosterPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    )
    try {
      await waitFor(() => {
        expect(authCalls).toBe(1)
      })
      expect(requestCalls).toBe(0)
      expect(petCalls).toBe(0)
      expect(screen.queryByRole('heading', { name: /Minnie/ })).not.toBeInTheDocument()
    } finally {
      await act(async () => {
        finishAuth()
      })
    }
    await waitFor(() => {
      expect(screen.getByTestId('bootstrap-status')).toHaveTextContent('anonymous')
    })
    expect(await screen.findByAltText('Minnie')).toHaveAttribute('src', '/medium.jpg')
    // A real guest's 401 no longer wipes the query client, so fresh persisted
    // data is used as-is instead of being refetched after the wipe.
    expect(requestCalls).toBe(persisted ? 0 : 1)
    expect(petCalls).toBe(persisted ? 0 : 1)
  }
)

it('keeps the same photo and sheet during background refetches, including failed refetches', async () => {
  queryClient.clear()
  queryClient.setQueryDefaults(['placement-poster'], { retry: false })
  queryClient.setQueryDefaults(['poster-pet'], { retry: false })
  const request = {
    id: 27,
    pet_id: 1,
    status: 'open',
    request_type: 'permanent',
    notes: '',
    pet: { id: 1, name: 'Minnie' },
    available_actions: { can_print_poster: false },
  }
  const pet = {
    id: 1,
    photos: [{ id: 10, medium_url: '/medium.jpg', url: '/display.jpg', is_primary: true }],
  }
  server.use(
    http.get('http://localhost:3000/api/placement-requests/27', () =>
      HttpResponse.json({ data: request })
    ),
    http.get('http://localhost:3000/api/pets/1', () => HttpResponse.json({ data: pet }))
  )
  render(
    <MemoryRouter initialEntries={['/requests/27/poster?lang=en&photo=10']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialStatus="anonymous" skipInitialLoad>
          <Routes>
            <Route path="/requests/:id/poster" element={<PlacementPosterPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  )
  const photo = await screen.findByAltText('Minnie')
  const sheet = photo.closest('article')
  let finish: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    finish = resolve
  })
  server.use(
    http.get('http://localhost:3000/api/placement-requests/27', async () => {
      await gate
      return new HttpResponse(null, { status: 500 })
    }),
    http.get('http://localhost:3000/api/pets/1', async () => {
      await gate
      return new HttpResponse(null, { status: 500 })
    })
  )
  let refetch: Promise<void> = Promise.resolve()
  await act(async () => {
    refetch = queryClient.invalidateQueries()
  })
  expect(screen.getByAltText('Minnie')).toBe(photo)
  expect(screen.getByAltText('Minnie').closest('article')).toBe(sheet)
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  await act(async () => {
    finish()
    await refetch
  })
  expect(screen.getByAltText('Minnie')).toBe(photo)
  expect(screen.getByAltText('Minnie').closest('article')).toBe(sheet)
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
})

function LocationProbe({ visit }: { visit: (search: string) => void }) {
  const location = useLocation()
  useEffect(() => {
    visit(location.search)
  }, [location.search, visit])
  return null
}

it.each([false, true])(
  'canonicalises once after loading the initial photo, complete URL: %s',
  async (complete) => {
    queryClient.clear()
    const visits: string[] = []
    const request = {
      id: 27,
      pet_id: 1,
      status: 'open',
      request_type: 'permanent',
      pet: { id: 1, name: 'Minnie' },
      available_actions: { can_print_poster: false },
    }
    server.use(
      http.get('http://localhost:3000/api/placement-requests/27', () =>
        HttpResponse.json({ data: request })
      ),
      http.get('http://localhost:3000/api/pets/1', () =>
        HttpResponse.json({
          data: {
            id: 1,
            photos: [{ id: 10, medium_url: '/medium.jpg', url: '/display.jpg', is_primary: true }],
          },
        })
      )
    )
    const search = complete ? '?lang=en&paper=a4&tabs=0&photo=10&focus=50,10' : '?focus=50,10'
    render(
      <MemoryRouter initialEntries={[`/requests/27/poster${search}`]}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialStatus="anonymous" skipInitialLoad>
            <LocationProbe
              visit={(value) => {
                visits.push(value)
              }}
            />
            <Routes>
              <Route path="/requests/:id/poster" element={<PlacementPosterPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    )
    const photo = await screen.findByAltText('Minnie')
    await waitFor(() => {
      expect(visits).toHaveLength(complete ? 1 : 2)
    })
    const canonical = new URLSearchParams(visits.at(-1))
    expect(canonical.get('photo')).toBe('10')
    expect(canonical.get('focus')).toBe('50,10')
    expect(canonical.get('lang')).toBe('en')
    expect(screen.getByAltText('Minnie')).toBe(photo)
  }
)
