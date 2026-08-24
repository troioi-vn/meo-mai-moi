import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter, userEvent } from '@/testing'
import { AddLitterDialog } from './AddLitterDialog'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import type { PostLittersBody } from '@/api/generated/model'

let postLittersCalls: PostLittersBody[] = []
let postLittersShouldFail: null | { status: number; body: unknown } = null

// Track litters POST via MSW handler override
const littersHandler = http.post('http://localhost:3000/api/litters', async ({ request }) => {
  const body = (await request.json()) as PostLittersBody
  postLittersCalls.push(body)

  if (postLittersShouldFail) {
    return HttpResponse.json(postLittersShouldFail.body as PostLittersBody, {
      status: postLittersShouldFail.status,
    })
  }
  return HttpResponse.json({ id: 99, members: [] }, { status: 201 })
})

function mockPetTypes(supports: { id: number; name: string; supports_litters?: boolean }[]) {
  return supports.map((pt) => ({
    id: pt.id,
    name: pt.name,
    slug: pt.name.toLowerCase(),
    description: '',
    is_active: true,
    is_system: true,
    display_order: pt.id,
    placement_requests_allowed: true,
    supports_litters: pt.supports_litters,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }))
}

describe('AddLitterDialog', () => {
  beforeEach(() => {
    postLittersCalls = []
    postLittersShouldFail = null
    // Setup server handlers: need to reset + add our litters handler
    // Use server.use to override
    server.use(littersHandler)
    // Mock pet-types to include litter-capable and not
    server.use(
      http.get('http://localhost:3000/api/pet-types', () => {
        return HttpResponse.json({
          data: mockPetTypes([
            { id: 1, name: 'Cat', supports_litters: true },
            { id: 2, name: 'Dog', supports_litters: false },
            { id: 3, name: 'Rabbit', supports_litters: true },
          ]),
        })
      })
    )
  })

  it('only offers pet types with supports_litters true', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddLitterDialog open={true} onOpenChange={() => {}} />)

    // Wait for pet types to load and open select
    await waitFor(() => {
      expect(screen.getByTestId('litter-pet-type-trigger')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('litter-pet-type-trigger'))

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cat' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Rabbit' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('option', { name: 'Dog' })).not.toBeInTheDocument()
  })

  it('builds correct payload for several members and posts once', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithRouter(<AddLitterDialog open={true} onOpenChange={onOpenChange} />)

    await waitFor(() => expect(screen.getByTestId('litter-pet-type-trigger')).toBeInTheDocument())
    await user.click(screen.getByTestId('litter-pet-type-trigger'))
    await waitFor(() => expect(screen.getByRole('option', { name: 'Cat' })).toBeInTheDocument())
    await user.click(screen.getByRole('option', { name: 'Cat' }))

    // Set member count to 3
    await user.click(screen.getByTestId('litter-member-count'))
    await waitFor(() => expect(screen.getByRole('option', { name: '3' })).toBeInTheDocument())
    await user.click(screen.getByRole('option', { name: '3' }))

    // Verify 3 rows rendered
    await waitFor(() => {
      expect(screen.getByTestId('litter-member-row-2')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('litter-member-row-3')).not.toBeInTheDocument()

    // Set sex for each member with one tap
    await user.click(screen.getByTestId('member-0-sex-male'))
    await user.click(screen.getByTestId('member-1-sex-female'))
    await user.click(screen.getByTestId('member-2-sex-male'))

    // Give optional name/weight to first member only
    await user.type(screen.getByTestId('member-0-name'), 'Milo')
    await user.type(screen.getByTestId('member-0-weight'), '0.5')

    await user.click(screen.getByTestId('litter-submit'))

    await waitFor(() => {
      expect(postLittersCalls.length).toBe(1)
    })

    const body = postLittersCalls[0]!
    expect(body.pet_type_id).toBe(1)
    expect(body.country).toBe('VN')
    const members = body.members
    expect(members.length).toBe(3)
    expect(members[0]!.sex).toBe('male')
    expect(members[0]!.name).toBe('Milo')
    expect(members[0]!.weight_kg).toBe(0.5)
    expect(members[1]!.sex).toBe('female')
    expect(members[1]!.name).toBeUndefined()
    expect(members[1]!.weight_kg).toBeUndefined()
    expect(members[2]!.sex).toBe('male')
  })

  it('omits blank name and weight from payload', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddLitterDialog open={true} onOpenChange={() => {}} />)

    await waitFor(() => expect(screen.getByTestId('litter-pet-type-trigger')).toBeInTheDocument())
    await user.click(screen.getByTestId('litter-pet-type-trigger'))
    await waitFor(() => expect(screen.getByRole('option', { name: 'Cat' })).toBeInTheDocument())
    await user.click(screen.getByRole('option', { name: 'Cat' }))

    // Keep default 4 members, leave names/weights blank (just set sexes)
    await user.click(screen.getByTestId('member-0-sex-female'))
    await user.click(screen.getByTestId('member-1-sex-male'))

    await user.click(screen.getByTestId('litter-submit'))

    await waitFor(() => {
      expect(postLittersCalls.length).toBe(1)
    })
    const body = postLittersCalls[0]!
    const members = body.members
    // Each member should have sex but no name/weight keys when blank
    for (const m of members) {
      expect(m.name).toBeUndefined()
      expect(m.weight_kg).toBeUndefined()
    }
  })

  it('surfaces 422 error as readable message', async () => {
    const user = userEvent.setup()
    postLittersShouldFail = {
      status: 422,
      body: { message: 'Validation failed', errors: { members: ['Between 2 and 12 members.'] } },
    }

    renderWithRouter(<AddLitterDialog open={true} onOpenChange={() => {}} />)

    await waitFor(() => expect(screen.getByTestId('litter-pet-type-trigger')).toBeInTheDocument())
    await user.click(screen.getByTestId('litter-pet-type-trigger'))
    await waitFor(() => expect(screen.getByRole('option', { name: 'Cat' })).toBeInTheDocument())
    await user.click(screen.getByRole('option', { name: 'Cat' }))

    await user.click(screen.getByTestId('litter-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('litter-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('litter-error')).toHaveTextContent('Between 2 and 12 members.')
  })

  it('sex control takes one tap per animal', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddLitterDialog open={true} onOpenChange={() => {}} />)

    await waitFor(() => expect(screen.getByTestId('litter-member-row-0')).toBeInTheDocument())

    // Each member row has 3 sex buttons; clicking one should update pressed state immediately
    const maleBtn = screen.getByTestId('member-0-sex-male')
    expect(maleBtn).toHaveAttribute('aria-pressed', 'false')
    await user.click(maleBtn)
    expect(maleBtn).toHaveAttribute('aria-pressed', 'true')

    const femaleBtn = screen.getByTestId('member-1-sex-female')
    await user.click(femaleBtn)
    expect(femaleBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
