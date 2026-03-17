import { api } from '@/api/axios'
import type { HelperProfile, PlacementRequestType } from '@/types/helper-profile'

export interface PublicHelperProfileFilters {
  country?: string
  city?: string
  request_type?: PlacementRequestType
  pet_type_id?: number
  search?: string
}

export const getPublicHelperProfiles = async (filters: PublicHelperProfileFilters = {}) => {
  return api.get<HelperProfile[]>('/helpers', { params: filters })
}

export const getPublicHelperProfile = async (id: number | string) => {
  return api.get<HelperProfile>(`/helpers/${String(id)}`)
}
