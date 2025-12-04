import { api } from './axios'
import type { Category } from '@/types/pet'

export interface ListCategoriesParams {
  pet_type_id: number
  search?: string
}

export interface CreateCategoryPayload {
  name: string
  pet_type_id: number
  description?: string
}

/**
 * Get categories for a specific pet type
 */
export const getCategories = async (params: ListCategoriesParams): Promise<Category[]> => {
  const searchParams = new URLSearchParams()
  searchParams.append('pet_type_id', String(params.pet_type_id))
  if (params.search) {
    searchParams.append('search', params.search)
  }

  const response = await api.get<{ data: Category[] }>(`/categories?${searchParams.toString()}`)
  return response.data.data
}

/**
 * Create a new category
 */
export const createCategory = async (data: CreateCategoryPayload): Promise<Category> => {
  const response = await api.post<{ data: Category }>('/categories', data)
  return response.data.data
}
