import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { HttpResponse, http } from 'msw'
import type { WeightHistory } from '@/api/generated/model'
import { AllTheProviders } from '@/testing/providers'
import { server } from '@/testing/mocks/server'
import { useOwnerWeights } from './useOwnerWeights'

const mockLoadUser = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    loadUser: mockLoadUser,
  }),
}))

const wrapper = AllTheProviders

describe('useOwnerWeights', () => {
  beforeEach(() => {
    server.resetHandlers()
    mockLoadUser.mockReset()
  })

  it('refreshes the authenticated user after creating the first owner weight record', async () => {
    const createdItem: WeightHistory = {
      id: 1,
      weight_kg: 62.4,
      record_date: '2026-05-12',
    }
    let requestCount = 0

    server.use(
      http.get('http://localhost:3000/api/users/me/owner-weights', () => {
        requestCount += 1

        return HttpResponse.json({
          data: {
            data: requestCount === 1 ? [] : [createdItem],
            meta: {
              total: requestCount === 1 ? 0 : 1,
              per_page: 15,
              current_page: 1,
            },
            links: {},
          },
        })
      }),
      http.post('http://localhost:3000/api/users/me/owner-weights', async ({ request }) => {
        const payload = await request.json()

        expect(payload).toEqual({
          weight_kg: 62.4,
          record_date: '2026-05-12',
        })

        return HttpResponse.json({ data: createdItem })
      })
    )

    const { result } = renderHook(() => useOwnerWeights(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.create({
        weight_kg: 62.4,
        record_date: '2026-05-12',
      })
    })

    await waitFor(() => {
      expect(result.current.items).toEqual([createdItem])
    })
    expect(mockLoadUser).toHaveBeenCalledTimes(1)
  })
})
