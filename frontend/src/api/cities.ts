import { api } from './axios'
import type { City } from '@/types/pet'

export interface ListCitiesParams {
  country: string
  search?: string
}

export interface CreateCityPayload {
  name: string
  country: string
  description?: string
}

export const getCities = async (params: ListCitiesParams): Promise<City[]> => {
  const searchParams = new URLSearchParams()
  searchParams.append('country', params.country)
  if (params.search) {
    searchParams.append('search', params.search)
  }

  return await api.get<City[]>(`/cities?${searchParams.toString()}`)
}

export const createCity = async (payload: CreateCityPayload): Promise<City> => {
  return await api.post<City>('/cities', payload)
}
