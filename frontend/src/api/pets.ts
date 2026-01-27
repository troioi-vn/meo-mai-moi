import { api } from './axios'
import type { Pet, PetType, BirthdayPrecision, PetSex, City } from '@/types/pet'

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
  completed_at?: string | null // ISO datetime - when set, record is completed/renewed
  created_at: string
  updated_at: string
}

export type MedicalRecordType = 'vaccination' | 'vet_visit' | 'medication' | 'treatment' | 'other'

export interface MedicalRecord {
  id: number
  pet_id: number
  record_type: MedicalRecordType
  description: string
  record_date: string // ISO date
  vet_name?: string | null
  attachment_url?: string | null
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
  return await api.get<Pet[]>('/pets')
}

export const getMyPets = async (): Promise<Pet[]> => {
  return await api.get<Pet[]>('/my-pets')
}

export const getMyPetsSections = async (): Promise<{
  owned: Pet[]
  fostering_active: Pet[]
  fostering_past: Pet[]
  transferred_away: Pet[]
}> => {
  return await api.get<{
    owned: Pet[]
    fostering_active: Pet[]
    fostering_past: Pet[]
    transferred_away: Pet[]
  }>('/my-pets/sections')
}

export interface CreatePetPayload {
  name: string
  sex?: PetSex
  country: string // ISO 3166-1 alpha-2 code
  state?: string
  city_id?: number | null
  city?: string
  address?: string
  description?: string
  pet_type_id: number | null
  // Category IDs
  category_ids?: number[]
  // Approximate birthday support
  birthday_precision?: BirthdayPrecision
  birthday?: string
  birthday_year?: number | null
  birthday_month?: number | null
  birthday_day?: number | null
}

export const createPet = async (petData: CreatePetPayload): Promise<Pet> => {
  return await api.post<Pet>('/pets', petData)
}

export const getPet = async (id: string): Promise<Pet> => {
  return await api.get<Pet>(`/pets/${id}`)
}

export interface PublicPet {
  id: number
  name: string
  sex?: 'male' | 'female' | 'not_specified'
  birthday_precision?: 'day' | 'month' | 'year' | 'unknown'
  birthday_year?: number | null
  birthday_month?: number | null
  birthday_day?: number | null
  country: string
  state?: string | null
  city_id?: number | null
  city?: City | string | null
  description: string
  status: 'active' | 'lost' | 'deceased' | 'deleted'
  pet_type_id: number
  photo_url?: string | null
  photos?: { id: number; url: string; thumb_url: string | null; is_primary: boolean }[]
  pet_type: Pet['pet_type']
  categories?: Pet['categories']
  placement_requests?: Pet['placement_requests']
  viewer_permissions?: {
    is_owner?: boolean
    is_viewer?: boolean
  }
  created_at: string
  updated_at: string
}

export const getPetPublic = async (id: string): Promise<PublicPet> => {
  return await api.get<PublicPet>(`/pets/${id}/view`)
}

export type UpdatePetPayload = Partial<CreatePetPayload>

export const updatePet = async (id: string, petData: UpdatePetPayload): Promise<Pet> => {
  return await api.put<Pet>(`/pets/${id}`, petData)
}

export const deletePet = async (id: string, password: string): Promise<void> => {
  await api.delete(`/pets/${id}`, {
    data: { password },
  })
}

export const updatePetStatus = async (id: string, status: string): Promise<Pet> => {
  return await api.put<Pet>(`/pets/${id}/status`, {
    status,
  })
}

export const uploadPetPhoto = async (petId: number, photo: File): Promise<Pet> => {
  const formData = new FormData()
  formData.append('photo', photo)

  return await api.post<Pet>(`/pets/${String(petId)}/photos`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const deletePetPhoto = async (
  petId: number,
  photoId: number | string = 'current'
): Promise<void> => {
  await api.delete(`/pets/${String(petId)}/photos/${String(photoId)}`)
}

export const setPrimaryPetPhoto = async (petId: number, photoId: number): Promise<Pet> => {
  return await api.post<Pet>(`/pets/${String(petId)}/photos/${String(photoId)}/set-primary`)
}

export const getPlacementRequests = async (): Promise<Pet[]> => {
  return await api.get<Pet[]>('/pets/placement-requests')
}

export const getFeaturedPets = async (): Promise<Pet[]> => {
  return await api.get<Pet[]>('/pets/featured')
}

export const getPetTypes = async (): Promise<PetType[]> => {
  return await api.get<PetType[]>('/pet-types')
}

// Weights API
export const getPetWeights = async (
  petId: number,
  page = 1
): Promise<{ data: WeightHistory[]; links: unknown; meta: unknown }> => {
  return await api.get<{ data: WeightHistory[]; links: unknown; meta: unknown }>(
    `/pets/${String(petId)}/weights`,
    { params: { page } }
  )
}

export const createWeight = async (
  petId: number,
  payload: { weight_kg: number; record_date: string }
): Promise<WeightHistory> => {
  return await api.post<WeightHistory>(`/pets/${String(petId)}/weights`, payload)
}

export const updateWeight = async (
  petId: number,
  weightId: number,
  payload: Partial<{ weight_kg: number; record_date: string }>
): Promise<WeightHistory> => {
  return await api.put<WeightHistory>(`/pets/${String(petId)}/weights/${String(weightId)}`, payload)
}

export const deleteWeight = async (petId: number, weightId: number): Promise<boolean> => {
  return await api.delete<boolean>(`/pets/${String(petId)}/weights/${String(weightId)}`)
}

// Medical Notes API
export const getMedicalNotes = async (
  petId: number,
  page = 1
): Promise<{ data: MedicalNote[]; links: unknown; meta: unknown }> => {
  return await api.get<{ data: MedicalNote[]; links: unknown; meta: unknown }>(
    `/pets/${String(petId)}/medical-notes`,
    { params: { page } }
  )
}

export const createMedicalNote = async (
  petId: number,
  payload: { note: string; record_date: string }
): Promise<MedicalNote> => {
  return await api.post<MedicalNote>(`/pets/${String(petId)}/medical-notes`, payload)
}

export const updateMedicalNote = async (
  petId: number,
  noteId: number,
  payload: Partial<{ note: string; record_date: string }>
): Promise<MedicalNote> => {
  return await api.put<MedicalNote>(
    `/pets/${String(petId)}/medical-notes/${String(noteId)}`,
    payload
  )
}

export const deleteMedicalNote = async (petId: number, noteId: number): Promise<boolean> => {
  return await api.delete<boolean>(`/pets/${String(petId)}/medical-notes/${String(noteId)}`)
}

// Vaccinations API
export type VaccinationStatus = 'active' | 'completed' | 'all'

export const getVaccinations = async (
  petId: number,
  page = 1,
  status: VaccinationStatus = 'active'
): Promise<{ data: VaccinationRecord[]; links: unknown; meta: unknown }> => {
  return await api.get<{ data: VaccinationRecord[]; links: unknown; meta: unknown }>(
    `/pets/${String(petId)}/vaccinations`,
    { params: { page, status } }
  )
}

// Microchips API
export const getMicrochips = async (
  petId: number,
  page = 1
): Promise<{ data: PetMicrochip[]; links: unknown; meta: unknown }> => {
  return await api.get<{ data: PetMicrochip[]; links: unknown; meta: unknown }>(
    `/pets/${String(petId)}/microchips`,
    { params: { page } }
  )
}

export const createMicrochip = async (
  petId: number,
  payload: { chip_number: string; issuer?: string | null; implanted_at?: string | null }
): Promise<PetMicrochip> => {
  return await api.post<PetMicrochip>(`/pets/${String(petId)}/microchips`, payload)
}

export const updateMicrochip = async (
  petId: number,
  microchipId: number,
  payload: Partial<{ chip_number: string; issuer?: string | null; implanted_at?: string | null }>
): Promise<PetMicrochip> => {
  return await api.put<PetMicrochip>(
    `/pets/${String(petId)}/microchips/${String(microchipId)}`,
    payload
  )
}

export const deleteMicrochip = async (petId: number, microchipId: number): Promise<boolean> => {
  return await api.delete<boolean>(`/pets/${String(petId)}/microchips/${String(microchipId)}`)
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
  return await api.post<VaccinationRecord>(`/pets/${String(petId)}/vaccinations`, payload)
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
  return await api.put<VaccinationRecord>(
    `/pets/${String(petId)}/vaccinations/${String(recordId)}`,
    payload
  )
}

export const deleteVaccination = async (petId: number, recordId: number): Promise<boolean> => {
  return await api.delete<boolean>(`/pets/${String(petId)}/vaccinations/${String(recordId)}`)
}

export const renewVaccination = async (
  petId: number,
  recordId: number,
  payload: {
    vaccine_name: string
    administered_at: string
    due_at?: string | null
    notes?: string | null
  }
): Promise<VaccinationRecord> => {
  return await api.post<VaccinationRecord>(
    `/pets/${String(petId)}/vaccinations/${String(recordId)}/renew`,
    payload
  )
}

// Medical Records API
export const getMedicalRecords = async (
  petId: number,
  page = 1,
  recordType?: MedicalRecordType
): Promise<{ data: MedicalRecord[]; links: unknown; meta: unknown }> => {
  const params: { page: number; record_type?: string } = { page }
  if (recordType) {
    params.record_type = recordType
  }
  return await api.get<{ data: MedicalRecord[]; links: unknown; meta: unknown }>(
    `/pets/${String(petId)}/medical-records`,
    { params }
  )
}

export const createMedicalRecord = async (
  petId: number,
  payload: {
    record_type: MedicalRecordType
    description: string
    record_date: string
    vet_name?: string | null
    attachment_url?: string | null
  }
): Promise<MedicalRecord> => {
  return await api.post<MedicalRecord>(`/pets/${String(petId)}/medical-records`, payload)
}

export const updateMedicalRecord = async (
  petId: number,
  recordId: number,
  payload: Partial<{
    record_type: MedicalRecordType
    description: string
    record_date: string
    vet_name?: string | null
    attachment_url?: string | null
  }>
): Promise<MedicalRecord> => {
  return await api.put<MedicalRecord>(
    `/pets/${String(petId)}/medical-records/${String(recordId)}`,
    payload
  )
}

export const deleteMedicalRecord = async (petId: number, recordId: number): Promise<boolean> => {
  return await api.delete<boolean>(`/pets/${String(petId)}/medical-records/${String(recordId)}`)
}
