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

export const getCat = async (id: string): Promise<Cat> => {
  const response = await api.get<{ data: Cat }>(`/cats/${id}`)
  return response.data.data
}

export const updateCat = async (
  id: string,
  catData: Omit<Cat, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'user' | 'viewer_permissions'>
): Promise<Cat> => {
  const response = await api.put<Cat>(`/cats/${id}`, catData)
  return response.data
}

export const deleteCat = async (id: string, password: string): Promise<void> => {
  await api.delete(`/cats/${id}`, {
    data: { password },
  })
}

export const updateCatStatus = async (
  id: string,
  status: string,
  password: string
): Promise<Cat> => {
  const response = await api.put<Cat>(`/cats/${id}/status`, {
    status,
    password,
  })
  return response.data
}
