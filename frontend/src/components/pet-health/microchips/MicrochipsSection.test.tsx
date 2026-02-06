import { render, screen, waitFor, fireEvent } from '@/testing'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import { MicrochipsSection } from './MicrochipsSection'

// A tiny in-memory store we can mutate per test; MSW handlers will use it
let mem: {
  id: number
  pet_id: number
  chip_number: string
  issuer: string | null
  implanted_at: string | null
  created_at: string
  updated_at: string
}[]

const now = () => new Date().toISOString()

const resetMem = () => {
  mem = []
}

const installMemHandlers = () => {
  server.use(
    http.get('http://localhost:3000/api/pets/:petId/microchips', ({ params, request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? '1')
      const data = mem.filter((m) => m.pet_id === Number(params.petId))
      return HttpResponse.json({
        data: {
          data,
          links: { first: null, last: null, prev: null, next: null },
          meta: {
            current_page: page,
            from: 1,
            last_page: 1,
            path: request.url,
            per_page: 25,
            to: data.length,
            total: data.length,
          },
        },
      })
    }),
    http.post('http://localhost:3000/api/pets/:petId/microchips', async ({ params, request }) => {
      const body = (await request.json()) as {
        chip_number?: string
        issuer?: string | null
        implanted_at?: string | null
      }
      if (!body.chip_number || body.chip_number.trim().length < 10) {
        return HttpResponse.json({ message: 'Validation error' }, { status: 422 })
      }
      const item = {
        id: Date.now(),
        pet_id: Number(params.petId),
        chip_number: body.chip_number.trim(),
        issuer: body.issuer ?? null,
        implanted_at: body.implanted_at ?? null,
        created_at: now(),
        updated_at: now(),
      }
      mem.unshift(item)
      return HttpResponse.json({ data: item }, { status: 201 })
    }),
    http.put(
      'http://localhost:3000/api/pets/:petId/microchips/:microchipId',
      async ({ params, request }) => {
        const body = (await request.json()) as Partial<{
          chip_number: string
          issuer?: string | null
          implanted_at?: string | null
        }>
        const id = Number(params.microchipId)
        const idx = mem.findIndex((m) => m.id === id)
        if (idx === -1) return new HttpResponse(null, { status: 404 })
        mem[idx] = { ...mem[idx], ...body, updated_at: now() }
        return HttpResponse.json({ data: mem[idx] })
      }
    ),
    http.delete('http://localhost:3000/api/pets/:petId/microchips/:microchipId', ({ params }) => {
      const id = Number(params.microchipId)
      mem = mem.filter((m) => m.id !== id)
      return HttpResponse.json({ data: true })
    })
  )
}

describe('MicrochipsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMem()
    installMemHandlers()
  })

  it('renders empty state and add flow', async () => {
    render(<MicrochipsSection petId={1} canEdit={true} />)

    // Initially loads
    await waitFor(() => {
      expect(screen.getByText('Microchips')).toBeInTheDocument()
    })
    expect(screen.getByText('No microchips recorded.')).toBeInTheDocument()

    // Start adding
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    const chipInput = screen.getByPlaceholderText('e.g., 982000123456789')
    fireEvent.change(chipInput, { target: { value: '982000123456789' } })
    const issuerInput = screen.getByPlaceholderText('HomeAgain, AVID, ...')
    fireEvent.change(issuerInput, { target: { value: 'HomeAgain' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.queryByText('No microchips recorded.')).not.toBeInTheDocument()
      expect(screen.getByText('982000123456789')).toBeInTheDocument()
      expect(screen.getByText(/Issuer:/)).toBeInTheDocument()
    })
  })

  it('validates chip number on create', async () => {
    render(<MicrochipsSection petId={1} canEdit={true} />)

    await waitFor(() => {
      expect(screen.getByText('Microchips')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    const chipInput = screen.getByPlaceholderText('e.g., 982000123456789')
    fireEvent.change(chipInput, { target: { value: 'short' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/Microchip number is required/)).toBeInTheDocument()
  })

  it('supports edit and delete actions', async () => {
    // Seed one item by calling the POST handler directly via fetch through component
    render(<MicrochipsSection petId={1} canEdit={true} />)

    await waitFor(() => {
      expect(screen.getByText('Microchips')).toBeInTheDocument()
    })

    // Add one
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.change(screen.getByPlaceholderText('e.g., 982000123456789'), {
      target: { value: '982000123456789' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('982000123456789')

    // Edit
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const issuerInput = screen.getByPlaceholderText('HomeAgain, AVID, ...')
    fireEvent.change(issuerInput, { target: { value: 'AVID' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(/Issuer: AVID/)).toBeInTheDocument()
    })

    // Delete
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    // Confirm in dialog
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.getByText('No microchips recorded.')).toBeInTheDocument()
    })
  })

  it('renders read-only when canEdit is false', async () => {
    // Preseed memory
    resetMem()
    mem.push({
      id: 1,
      pet_id: 1,
      chip_number: '982000111111111',
      issuer: null,
      implanted_at: null,
      created_at: now(),
      updated_at: now(),
    })
    installMemHandlers()

    render(<MicrochipsSection petId={1} canEdit={false} />)

    await screen.findByText('982000111111111')

    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})
