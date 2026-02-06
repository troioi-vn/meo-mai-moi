import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { usePlacementInfo } from './usePlacementInfo'
import type { Pet } from '@/types/pet'

describe('usePlacementInfo', () => {
  // Helper to create minimal Pet object
  const createPet = (overrides: Partial<Pet> = {}): Pet =>
    ({
      id: 1,
      name: 'Test Pet',
      pet_type: {
        id: 1,
        name: 'Cat',
        slug: 'cat',
        is_active: true,
        is_system: false,
        display_order: 1,
        placement_requests_allowed: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        ...overrides.pet_type,
      } as any,
      ...overrides,
    }) as Pet

  describe('when pet does not support placement', () => {
    it('returns defaults', () => {
      const pet = createPet({
        pet_type: {
          id: 2,
          name: 'Dog',
          slug: 'dog',
          is_active: true,
          is_system: false,
          display_order: 2,
          placement_requests_allowed: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        } as any,
      })

      const { result } = renderHook(() => usePlacementInfo(pet, 123))

      expect(result.current).toEqual({
        supportsPlacement: false,
        hasActivePlacementRequest: false,
        activePlacementRequest: undefined,
        myPendingResponse: undefined,
        myAcceptedResponse: undefined,
        myPendingTransfer: undefined,
      })
    })
  })

  describe('when pet supports placement but has no placement_requests', () => {
    it('uses pet.placement_request_active for hasActivePlacementRequest', () => {
      const pet = createPet({
        placement_requests: [],
        placement_request_active: true,
      })

      const { result } = renderHook(() => usePlacementInfo(pet, 123))

      expect(result.current.supportsPlacement).toBe(true)
      expect(result.current.hasActivePlacementRequest).toBe(true)
      expect(result.current.activePlacementRequest).toBeUndefined()
      expect(result.current.myPendingResponse).toBeUndefined()
      expect(result.current.myAcceptedResponse).toBeUndefined()
      expect(result.current.myPendingTransfer).toBeUndefined()
    })

    it('returns false for hasActivePlacementRequest when placement_request_active is false', () => {
      const pet = createPet({
        placement_requests: [],
        placement_request_active: false,
      })

      const { result } = renderHook(() => usePlacementInfo(pet))

      expect(result.current.hasActivePlacementRequest).toBe(false)
    })
  })

  describe('activePlacementRequest selection', () => {
    it('ignores requests with non-visible statuses', () => {
      const pet = createPet({
        placement_requests: [
          {
            id: 1,
            status: 'closed' as const,
            responses: [],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          } as any,
          {
            id: 2,
            status: 'cancelled' as const,
            responses: [],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          } as any,
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet))

      expect(result.current.activePlacementRequest).toBeUndefined()
      expect(result.current.hasActivePlacementRequest).toBe(false)
    })

    it('picks the first visible request (open)', () => {
      const openRequest = {
        id: 1,
        status: 'open' as const,
        responses: [],
        pet_id: 1,
        request_type: 'placement',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      } as any
      const pet = createPet({
        placement_requests: [
          openRequest,
          {
            id: 2,
            status: 'pending_transfer' as const,
            responses: [],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          } as any,
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet))

      expect(result.current.activePlacementRequest).toEqual(openRequest)
      expect(result.current.hasActivePlacementRequest).toBe(true)
    })

    it('picks the first visible request (pending_transfer)', () => {
      const pendingRequest = {
        id: 2,
        status: 'pending_transfer' as const,
        responses: [],
        pet_id: 1,
        request_type: 'placement',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      } as any
      const pet = createPet({
        placement_requests: [
          {
            id: 1,
            status: 'closed' as const,
            responses: [],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          } as any,
          pendingRequest,
          {
            id: 3,
            status: 'active' as const,
            responses: [],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          } as any,
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet))

      expect(result.current.activePlacementRequest).toEqual(pendingRequest)
    })

    it('picks the first visible request (active)', () => {
      const activeRequest = {
        id: 3,
        status: 'active' as const,
        responses: [],
        pet_id: 1,
        request_type: 'placement',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      } as any
      const pet = createPet({
        placement_requests: [
          {
            id: 1,
            status: 'closed' as const,
            responses: [],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          } as any,
          activeRequest,
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet))

      expect(result.current.activePlacementRequest).toEqual(activeRequest)
    })
  })

  describe('user-specific fields', () => {
    const userId = 123

    it('finds myPendingResponse when response.status === "responded" and user matches', () => {
      const pendingResponse = {
        id: 1,
        status: 'responded' as const,
        helper_profile: {
          id: 456,
          user_id: userId,
          display_name: 'Test Helper',
          user: { id: userId },
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        } as any,
        placement_request_id: 1,
        helper_profile_id: 456,
        responded_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }
      const pet = createPet({
        placement_requests: [
          {
            id: 1,
            status: 'open' as const,
            responses: [pendingResponse],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet, userId))

      expect(result.current.myPendingResponse).toEqual(pendingResponse)
    })

    it('ignores responded responses from other users', () => {
      const pet = createPet({
        placement_requests: [
          {
            id: 1,
            status: 'open' as const,
            responses: [
              {
                id: 1,
                status: 'responded' as const,
                helper_profile: {
                  id: 456,
                  user_id: 999,
                  display_name: 'Other Helper',
                  user: { id: 999 },
                  is_active: true,
                  created_at: '2023-01-01T00:00:00Z',
                  updated_at: '2023-01-01T00:00:00Z',
                } as any, // different user
                placement_request_id: 1,
                helper_profile_id: 456,
                responded_at: '2023-01-01T00:00:00Z',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z',
              },
            ],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet, userId))

      expect(result.current.myPendingResponse).toBeUndefined()
    })

    it('finds myAcceptedResponse when response.status === "accepted" and user matches', () => {
      const acceptedResponse = {
        id: 2,
        status: 'accepted' as const,
        helper_profile: {
          id: 456,
          user_id: userId,
          display_name: 'Test Helper',
          user: { id: userId },
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        } as any,
        transfer_request: { status: 'completed' as const } as any,
        placement_request_id: 1,
        helper_profile_id: 456,
        responded_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }
      const pet = createPet({
        placement_requests: [
          {
            id: 1,
            status: 'open' as const,
            responses: [acceptedResponse],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet, userId))

      expect(result.current.myAcceptedResponse).toEqual(acceptedResponse)
    })

    it('sets myPendingTransfer only when accepted response has transfer_request.status === "pending"', () => {
      const pendingTransfer = { status: 'pending' as const, id: 1 }
      const acceptedResponse = {
        id: 2,
        status: 'accepted' as const,
        helper_profile: {
          id: 456,
          user_id: userId,
          display_name: 'Test Helper',
          user: { id: userId },
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        } as any,
        transfer_request: pendingTransfer as any,
        placement_request_id: 1,
        helper_profile_id: 456,
        responded_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }
      const pet = createPet({
        placement_requests: [
          {
            id: 1,
            status: 'active' as const,
            responses: [acceptedResponse],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet, userId))

      expect(result.current.myPendingTransfer).toEqual(pendingTransfer)
    })

    it('does not set myPendingTransfer when transfer_request.status !== "pending"', () => {
      const acceptedResponse = {
        id: 2,
        status: 'accepted' as const,
        helper_profile: {
          id: 456,
          user_id: userId,
          display_name: 'Test Helper',
          user: { id: userId },
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        } as any,
        transfer_request: { status: 'completed' as const, id: 1 } as any,
        placement_request_id: 1,
        helper_profile_id: 456,
        responded_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }
      const pet = createPet({
        placement_requests: [
          {
            id: 1,
            status: 'active' as const,
            responses: [acceptedResponse],
            pet_id: 1,
            request_type: 'placement',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        ],
      })

      const { result } = renderHook(() => usePlacementInfo(pet, userId))

      expect(result.current.myPendingTransfer).toBeUndefined()
    })
  })
})
