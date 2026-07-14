import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  forgetLeftGroup,
  getGroupInvitationsQueryKey,
  getGroupQueryKey,
  getGroupsQueryKey,
} from './groups'

vi.mock('@/lib/pet-cache', () => ({
  invalidatePetCollectionQueries: vi.fn().mockResolvedValue(undefined),
}))

describe('forgetLeftGroup', () => {
  let queryClient: QueryClient
  let cancelSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>
  let invalidateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    cancelSpy = vi.spyOn(queryClient, 'cancelQueries')
    removeSpy = vi.spyOn(queryClient, 'removeQueries')
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  })

  it('drops group detail caches without invalidating them for refetch', async () => {
    await forgetLeftGroup(queryClient, 9)

    expect(cancelSpy).toHaveBeenCalledWith({ queryKey: getGroupQueryKey(9) })
    expect(cancelSpy).toHaveBeenCalledWith({ queryKey: getGroupInvitationsQueryKey(9) })
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: getGroupQueryKey(9) })
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: getGroupInvitationsQueryKey(9) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: getGroupsQueryKey() })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: getGroupQueryKey(9) })
  })
})
