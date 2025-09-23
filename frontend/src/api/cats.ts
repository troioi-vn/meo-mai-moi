import { api } from './axios'
import type { Cat } from '@/types/cat'

export const getAllCats = async (): Promise<Cat[]> => {
  const response = await api.get<{ data: Cat[] }>('/cats')
  return response.data.data
}

export const getMyCats = async (): Promise<Cat[]> => {
  const response = await api.get<{ data: Cat[] }>('/my-cats')
  return response.data.data
}

export const getMyCatsSections = async (): Promise<{
  owned: Cat[]
  fostering_active: Cat[]
  fostering_past: Cat[]
  transferred_away: Cat[]
}> => {
  const response = await api.get<{
    data: {
      owned: Cat[]
      fostering_active: Cat[]
      fostering_past: Cat[]
      transferred_away: Cat[]
    }
  }>('/my-cats/sections')
  return response.data.data
}

export const createCat = async (
  catData: Omit<
    Cat,
    'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'user' | 'viewer_permissions'
  >
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

export const uploadCatPhoto = async (catId: number, photo: File): Promise<Cat> => {
  const formData = new FormData()
  formData.append('photo', photo)

  const response = await api.post<Cat>(`/cats/${String(catId)}/photos`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteCatPhoto = async (catId: number): Promise<Cat> => {
  const response = await api.delete<Cat>(`/cats/${String(catId)}/photo`)
  return response.data
}

export const getPlacementRequests = async (): Promise<Cat[]> => {
  const response = await api.get<{ data: Cat[] }>('/cats/placement-requests')
  return response.data.data
}
