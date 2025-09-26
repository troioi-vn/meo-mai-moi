import { api } from './axios'
import type { Pet, PetType } from '@/types/pet'

export interface WeightHistory {
  id: number
  pet_id: number
  weight_kg: number
  record_date: string // ISO date
  created_at: string
  updated_at: string
}

export const getAllPets = async (): Promise<Pet[]> => {
  const response = await api.get<{ data: Pet[] }>('/pets')
  return response.data.data
}

export const getMyPets = async (): Promise<Pet[]> => {
  const response = await api.get<{ data: Pet[] }>('/my-pets')
  return response.data.data
}

export const getMyPetsSections = async (): Promise<{
  owned: Pet[]
  fostering_active: Pet[]
  fostering_past: Pet[]
  transferred_away: Pet[]
}> => {
  const response = await api.get<{
    data: {
      owned: Pet[]
      fostering_active: Pet[]
      fostering_past: Pet[]
      transferred_away: Pet[]
    }
  }>('/my-pets/sections')
  return response.data.data
}

export const createPet = async (
  petData: Omit<
    Pet,
    'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'user' | 'viewer_permissions' | 'pet_type'
  >
): Promise<Pet> => {
  const response = await api.post<{ data: Pet }>('/pets', petData)
  return response.data.data
}

export const getPet = async (id: string): Promise<Pet> => {
  const response = await api.get<{ data: Pet }>(`/pets/${id}`)
  return response.data.data
}

export const updatePet = async (
  id: string,
  petData: Partial<Omit<Pet, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'user' | 'viewer_permissions' | 'pet_type'>>
): Promise<Pet> => {
  const response = await api.put<{ data: Pet }>(`/pets/${id}`, petData)
  return response.data.data
}

export const deletePet = async (id: string, password: string): Promise<void> => {
  await api.delete(`/pets/${id}`, {
    data: { password },
  })
}

export const updatePetStatus = async (
  id: string,
  status: string,
  password: string
): Promise<Pet> => {
  const response = await api.put<{ data: Pet }>(`/pets/${id}/status`, {
    status,
    password,
  })
  return response.data.data
}

export const uploadPetPhoto = async (petId: number, photo: File): Promise<Pet> => {
  const formData = new FormData()
  formData.append('photo', photo)

  const response = await api.post<{ data: Pet }>(`/pets/${String(petId)}/photos`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data.data
}

export const deletePetPhoto = async (petId: number, photoId: number): Promise<void> => {
  await api.delete(`/pets/${String(petId)}/photos/${String(photoId)}`)
}

export const getPlacementRequests = async (): Promise<Pet[]> => {
  const response = await api.get<{ data: Pet[] }>('/pets/placement-requests')
  return response.data.data
}

export const getFeaturedPets = async (): Promise<Pet[]> => {
  const response = await api.get<{ data: Pet[] }>('/pets/featured')
  return response.data.data
}

export const getPetTypes = async (): Promise<PetType[]> => {
  const response = await api.get<{ data: PetType[] }>('/pet-types')
  return response.data.data
}

// Weights API
export const getPetWeights = async (
  petId: number,
  page = 1
): Promise<{ data: WeightHistory[]; links: unknown; meta: unknown }> => {
  const response = await api.get<{ data: { data: WeightHistory[]; links: unknown; meta: unknown } }>(
    `/pets/${String(petId)}/weights`,
    { params: { page } }
  )
  return response.data.data
}

export const createWeight = async (
  petId: number,
  payload: { weight_kg: number; record_date: string }
): Promise<WeightHistory> => {
  const response = await api.post<{ data: WeightHistory }>(`/pets/${String(petId)}/weights`, payload)
  return response.data.data
}

export const updateWeight = async (
  petId: number,
  weightId: number,
  payload: Partial<{ weight_kg: number; record_date: string }>
): Promise<WeightHistory> => {
  const response = await api.put<{ data: WeightHistory }>(
    `/pets/${String(petId)}/weights/${String(weightId)}`,
    payload
  )
  return response.data.data
}

export const deleteWeight = async (petId: number, weightId: number): Promise<boolean> => {
  const response = await api.delete<{ data: boolean }>(
    `/pets/${String(petId)}/weights/${String(weightId)}`
  )
  return response.data.data
}
