import { api } from './axios'
import type { Pet, PetType, BirthdayPrecision } from '@/types/pet'

export interface WeightHistory {
  id: number
  pet_id: number
  weight_kg: number
  record_date: string // ISO date
  created_at: string
  updated_at: string
}

export interface MedicalNote {
  id: number
  pet_id: number
  note: string
  record_date: string // ISO date
  created_at: string
  updated_at: string
}

export interface VaccinationRecord {
  id: number
  pet_id: number
  vaccine_name: string
  administered_at: string // ISO date
  due_at?: string | null // ISO date
  notes?: string | null
  reminder_sent_at?: string | null
  created_at: string
  updated_at: string
}

export interface PetMicrochip {
  id: number
  pet_id: number
  chip_number: string
  issuer?: string | null
  implanted_at?: string | null // ISO date
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

export interface CreatePetPayload {
  name: string
  breed: string
  location: string
  description: string
  pet_type_id: number | null
  // Approximate birthday support
  birthday_precision?: BirthdayPrecision
  birthday?: string
  birthday_year?: number | null
  birthday_month?: number | null
  birthday_day?: number | null
}

export const createPet = async (petData: CreatePetPayload): Promise<Pet> => {
  const response = await api.post<{ data: Pet }>('/pets', petData)
  return response.data.data
}

export const getPet = async (id: string): Promise<Pet> => {
  const response = await api.get<{ data: Pet }>(`/pets/${id}`)
  return response.data.data
}

export type UpdatePetPayload = Partial<CreatePetPayload>

export const updatePet = async (id: string, petData: UpdatePetPayload): Promise<Pet> => {
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

export const deletePetPhoto = async (petId: number, photoId: number | string = 'current'): Promise<void> => {
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
  const response = await api.get<{
    data: { data: WeightHistory[]; links: unknown; meta: unknown }
  }>(`/pets/${String(petId)}/weights`, { params: { page } })
  return response.data.data
}

export const createWeight = async (
  petId: number,
  payload: { weight_kg: number; record_date: string }
): Promise<WeightHistory> => {
  const response = await api.post<{ data: WeightHistory }>(
    `/pets/${String(petId)}/weights`,
    payload
  )
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

// Medical Notes API
export const getMedicalNotes = async (
  petId: number,
  page = 1
): Promise<{ data: MedicalNote[]; links: unknown; meta: unknown }> => {
  const response = await api.get<{ data: { data: MedicalNote[]; links: unknown; meta: unknown } }>(
    `/pets/${String(petId)}/medical-notes`,
    { params: { page } }
  )
  return response.data.data
}

export const createMedicalNote = async (
  petId: number,
  payload: { note: string; record_date: string }
): Promise<MedicalNote> => {
  const response = await api.post<{ data: MedicalNote }>(
    `/pets/${String(petId)}/medical-notes`,
    payload
  )
  return response.data.data
}

export const updateMedicalNote = async (
  petId: number,
  noteId: number,
  payload: Partial<{ note: string; record_date: string }>
): Promise<MedicalNote> => {
  const response = await api.put<{ data: MedicalNote }>(
    `/pets/${String(petId)}/medical-notes/${String(noteId)}`,
    payload
  )
  return response.data.data
}

export const deleteMedicalNote = async (petId: number, noteId: number): Promise<boolean> => {
  const response = await api.delete<{ data: boolean }>(
    `/pets/${String(petId)}/medical-notes/${String(noteId)}`
  )
  return response.data.data
}

// Vaccinations API
export const getVaccinations = async (
  petId: number,
  page = 1
): Promise<{ data: VaccinationRecord[]; links: unknown; meta: unknown }> => {
  const response = await api.get<{
    data: { data: VaccinationRecord[]; links: unknown; meta: unknown }
  }>(`/pets/${String(petId)}/vaccinations`, { params: { page } })
  return response.data.data
}

// Microchips API
export const getMicrochips = async (
  petId: number,
  page = 1
): Promise<{ data: PetMicrochip[]; links: unknown; meta: unknown }> => {
  const response = await api.get<{ data: { data: PetMicrochip[]; links: unknown; meta: unknown } }>(
    `/pets/${String(petId)}/microchips`,
    { params: { page } }
  )
  return response.data.data
}

export const createMicrochip = async (
  petId: number,
  payload: { chip_number: string; issuer?: string | null; implanted_at?: string | null }
): Promise<PetMicrochip> => {
  const response = await api.post<{ data: PetMicrochip }>(
    `/pets/${String(petId)}/microchips`,
    payload
  )
  return response.data.data
}

export const updateMicrochip = async (
  petId: number,
  microchipId: number,
  payload: Partial<{ chip_number: string; issuer?: string | null; implanted_at?: string | null }>
): Promise<PetMicrochip> => {
  const response = await api.put<{ data: PetMicrochip }>(
    `/pets/${String(petId)}/microchips/${String(microchipId)}`,
    payload
  )
  return response.data.data
}

export const deleteMicrochip = async (petId: number, microchipId: number): Promise<boolean> => {
  const response = await api.delete<{ data: boolean }>(
    `/pets/${String(petId)}/microchips/${String(microchipId)}`
  )
  return response.data.data
}

export const createVaccination = async (
  petId: number,
  payload: {
    vaccine_name: string
    administered_at: string
    due_at?: string | null
    notes?: string | null
  }
): Promise<VaccinationRecord> => {
  const response = await api.post<{ data: VaccinationRecord }>(
    `/pets/${String(petId)}/vaccinations`,
    payload
  )
  return response.data.data
}

export const updateVaccination = async (
  petId: number,
  recordId: number,
  payload: Partial<{
    vaccine_name: string
    administered_at: string
    due_at?: string | null
    notes?: string | null
  }>
): Promise<VaccinationRecord> => {
  const response = await api.put<{ data: VaccinationRecord }>(
    `/pets/${String(petId)}/vaccinations/${String(recordId)}`,
    payload
  )
  return response.data.data
}

export const deleteVaccination = async (petId: number, recordId: number): Promise<boolean> => {
  const response = await api.delete<{ data: boolean }>(
    `/pets/${String(petId)}/vaccinations/${String(recordId)}`
  )
  return response.data.data
}
