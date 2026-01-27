import { useQueryClient } from '@tanstack/react-query'
import { usePostPlacementRequests } from '@/api/generated/placement-requests/placement-requests'
import { toast } from 'sonner'
import type { PlacementRequest } from '@/types/pet'
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
        const placementRequest = data
        // Invalidate and refetch the pet profile to show the new request
        void queryClient.invalidateQueries({
          queryKey: ['pet', placementRequest.pet_id.toString()],
        })
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
