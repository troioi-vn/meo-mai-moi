import {
  getCategories as generatedGetCategories,
  postCategories as generatedPostCategories,
} from './generated/categories/categories'
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
  const response = await generatedGetCategories(params)
  return response.data as unknown as Category[]
}

/**
 * Create a new category
 */
export const createCategory = async (data: CreateCategoryPayload): Promise<Category> => {
  const response = await generatedPostCategories(data)
  return response.data as unknown as Category
}
