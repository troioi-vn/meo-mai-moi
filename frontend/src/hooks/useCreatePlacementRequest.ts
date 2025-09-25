import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/axios'
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

const createPlacementRequest = async (
  payload: PlacementRequestPayload
): Promise<PlacementRequest> => {
  const { data } = await api.post<{ data: PlacementRequest }>('/placement-requests', payload)
  return data.data
}

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

export const useCreatePlacementRequest = () => {
  const queryClient = useQueryClient()

  return useMutation<PlacementRequest, AxiosError<ApiError>, PlacementRequestPayload>({
    mutationFn: createPlacementRequest,
    onSuccess: (data) => {
      toast.success('Placement request created successfully!')
      // Invalidate and refetch the pet profile to show the new request
      void queryClient.invalidateQueries({ queryKey: ['pet', data.pet_id.toString()] })
    },
    onError: (error) => {
      const status = error.response?.status
      const errorMessage =
        status === 409
          ? 'An active placement request of this type already exists for this pet.'
          : (error.response?.data.message ?? 'Failed to create placement request.')
      toast.error(errorMessage)
    },
  })
}
