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

  const response = await api.get<{ data: City[] }>(`/cities?${searchParams.toString()}`)
  return response.data.data
}

export const createCity = async (payload: CreateCityPayload): Promise<City> => {
  const response = await api.post<{ data: City }>('/cities', payload)
  return response.data.data
}

