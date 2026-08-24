import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter, userEvent } from '@/testing'
import { AddLitterDialog } from './AddLitterDialog'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import type { PostLittersBody } from '@/api/generated/model'

let postLittersCalls: PostLittersBody[] = []

function mockPetTypes() {
  return [
    {
      id: 1,
      name: 'Cat',
      slug: 'cat',
      description: '',
      is_active: true,
      is_system: true,
      display_order: 1,
      placement_requests_allowed: true,
      supports_litters: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]
}

describe('AddLitterDialog with groupId', () => {
  beforeEach(() => {
    postLittersCalls = []
    server.use(
      http.get('http://localhost:3000/api/pet-types', () => {
        return HttpResponse.json({ data: mockPetTypes() })
      }),
      http.post('http://localhost:3000/api/litters', async ({ request }) => {
        const body = (await request.json()) as PostLittersBody
        postLittersCalls.push(body)
        return HttpResponse.json({ id: 99, members: [] }, { status: 201 })
      })
    )
  })

  it('sends group_id when groupId prop is provided', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithRouter(<AddLitterDialog open={true} onOpenChange={onOpenChange} groupId={42} />)

    await waitFor(() => {
      expect(screen.getByTestId('litter-pet-type-trigger')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('litter-pet-type-trigger'))
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cat' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('option', { name: 'Cat' }))

    await user.click(screen.getByTestId('litter-submit'))

    await waitFor(() => {
      expect(postLittersCalls.length).toBe(1)
    })
    expect((postLittersCalls[0] as unknown as Record<string, unknown>).group_id).toBe(42)
  })

  it('omits group_id when no groupId prop', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddLitterDialog open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByTestId('litter-pet-type-trigger')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('litter-pet-type-trigger'))
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cat' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('option', { name: 'Cat' }))

    await user.click(screen.getByTestId('litter-submit'))

    await waitFor(() => {
      expect(postLittersCalls.length).toBe(1)
    })
    const body = postLittersCalls[0] as unknown as Record<string, unknown>
    expect(body.group_id).toBeUndefined()
  })

  it('omits group_id when groupId is null', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AddLitterDialog open={true} onOpenChange={() => {}} groupId={null} />)

    await waitFor(() => {
      expect(screen.getByTestId('litter-pet-type-trigger')).toBeInTheDocument()
    })
    await user.click(screen.getByTestId('litter-pet-type-trigger'))
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cat' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('option', { name: 'Cat' }))

    await user.click(screen.getByTestId('litter-submit'))

    await waitFor(() => {
      expect(postLittersCalls.length).toBe(1)
    })
    const body = postLittersCalls[0] as unknown as Record<string, unknown>
    expect(body.group_id).toBeUndefined()
  })
})
