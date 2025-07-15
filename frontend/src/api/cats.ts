import { api } from './axios'
import type { Cat } from '@/types/cat'

export const getMyCats = async (): Promise<Cat[]> => {
  const response = await api.get<Cat[]>('/my-cats')
  return response.data
}

export const createCat = async (
  catData: Omit<Cat, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at'>
): Promise<Cat> => {
  const response = await api.post<Cat>('/cats', catData)
  return response.data
}
