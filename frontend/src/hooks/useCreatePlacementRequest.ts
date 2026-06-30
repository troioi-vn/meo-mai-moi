import { useQueryClient } from '@tanstack/react-query'
import {
  getGetPetsIdQueryKey,
  getGetPetsIdViewQueryKey,
  getGetPetsPlacementRequestsQueryKey,
} from '@/api/generated/pets/pets'
import { usePostPlacementRequests } from '@/api/generated/placement-requests/placement-requests'
import { toast } from '@/lib/i18n-toast'
import { AxiosError } from 'axios'

export interface PlacementRequestPayload {
  pet_id: number
  request_type: string
  notes?: string
  expires_at?: string
  start_date?: string
  end_date?: string
}

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

export const useCreatePlacementRequest = () => {
  const queryClient = useQueryClient()

  return usePostPlacementRequests({
    mutation: {
      onSuccess: (data) => {
        toast.success('Placement request created successfully!')
        const petId = data.pet_id
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) }),
          queryClient.invalidateQueries({ queryKey: getGetPetsIdViewQueryKey(petId) }),
          queryClient.invalidateQueries({ queryKey: getGetPetsPlacementRequestsQueryKey() }),
        ])
      },
      onError: (error: AxiosError<ApiError>) => {
        const status = error.response?.status
        const errorMessage =
          status === 409
            ? 'An active placement request of this type already exists for this pet.'
            : (error.response?.data.message ?? 'Failed to create placement request.')
        toast.error(errorMessage)
      },
    },
  })
}
