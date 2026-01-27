import {
  getMyPets as generatedGetMyPets,
  getMyPetsSections as generatedGetMyPetsSections,
  postPets as generatedPostPets,
  getPetsId as generatedGetPetsId,
  getPetsIdView as generatedGetPetsIdView,
  putPetsId as generatedPutPetsId,
  deletePetsId as generatedDeletePetsId,
  putPetsIdStatus as generatedPutPetsIdStatus,
  getPetsPlacementRequests as generatedGetPetsPlacementRequests,
  getPetsFeatured as generatedGetPetsFeatured,
  getPetsPetWeights as generatedGetPetsPetWeights,
  postPetsPetWeights as generatedPostPetsPetWeights,
  putPetsPetWeightsWeight as generatedPutPetsPetWeightsWeight,
  deletePetsPetWeightsWeight as generatedDeletePetsPetWeightsWeight,
  getPetsPetMedicalNotes as generatedGetPetsPetMedicalNotes,
  postPetsPetMedicalNotes as generatedPostPetsPetMedicalNotes,
  putPetsPetMedicalNotesNote as generatedPutPetsPetMedicalNotesNote,
  deletePetsPetMedicalNotesNote as generatedDeletePetsPetMedicalNotesNote,
  getPetsPetVaccinations as generatedGetPetsPetVaccinations,
  postPetsPetVaccinations as generatedPostPetsPetVaccinations,
  deletePetsPetVaccinationsRecord as generatedDeletePetsPetVaccinationsRecord,
  putPetsPetVaccinationsRecord as generatedPutPetsPetVaccinationsRecord,
  postPetsPetVaccinationsRecordRenew as generatedPostPetsPetVaccinationsRecordRenew,
  getPetsPetMicrochips as generatedGetPetsPetMicrochips,
  postPetsPetMicrochips as generatedPostPetsPetMicrochips,
  putPetsPetMicrochipsMicrochip as generatedPutPetsPetMicrochipsMicrochip,
  deletePetsPetMicrochipsMicrochip as generatedDeletePetsPetMicrochipsMicrochip,
  getPetsPetMedicalRecords as generatedGetPetsPetMedicalRecords,
  postPetsPetMedicalRecords as generatedPostPetsPetMedicalRecords,
  putPetsPetMedicalRecordsRecord as generatedPutPetsPetMedicalRecordsRecord,
  deletePetsPetMedicalRecordsRecord as generatedDeletePetsPetMedicalRecordsRecord,
} from './generated/pets/pets'
import { getPetTypes as generatedGetPetTypes } from './generated/pet-types/pet-types'
import {
  postPetsPetPhotos as generatedPostPetsPetPhotos,
  deletePetsPetPhotosPhoto as generatedDeletePetsPetPhotosPhoto,
  postPetsPetPhotosPhotoSetPrimary as generatedPostPetsPetPhotosPhotoSetPrimary,
} from './generated/pet-photos/pet-photos'
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

export const getPets = async (
  page = 1,
  status?: any
): Promise<{ data: Pet[]; links: unknown; meta: unknown }> => {
  const response = await generatedGetMyPets({ params: { page, status } } as any)
  return response as any
}

export const getMyPets = async (): Promise<Pet[]> => {
  const response = await generatedGetMyPets()
  return response as unknown as Pet[]
}

export const getMyPetsSections = async (): Promise<{
  owned: Pet[]
  fostering_active: Pet[]
  fostering_past: Pet[]
  transferred_away: Pet[]
}> => {
  const response = await generatedGetMyPetsSections()
  return response as unknown as {
    owned: Pet[]
    fostering_active: Pet[]
    fostering_past: Pet[]
    transferred_away: Pet[]
  }
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
  const response = await generatedPostPets(petData as unknown as Pet)
  return response as unknown as Pet
}

export const getPet = async (id: string): Promise<Pet> => {
  const response = await generatedGetPetsId(Number(id))
  return response as unknown as Pet
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
  const response = await generatedGetPetsIdView(Number(id))
  return response as unknown as PublicPet
}

export type UpdatePetPayload = Partial<CreatePetPayload>

export const updatePet = async (id: string, petData: UpdatePetPayload): Promise<Pet> => {
  const response = await generatedPutPetsId(Number(id), petData as unknown as Pet)
  return response as unknown as Pet
}

export const deletePet = async (id: string, password: string): Promise<void> => {
  await generatedDeletePetsId(Number(id), { password })
}

export const updatePetStatus = async (id: string, status: string): Promise<Pet> => {
  const response = await generatedPutPetsIdStatus(Number(id), {
    status: status as any,
  })
  return response as unknown as Pet
}

export const uploadPetPhoto = async (petId: number, photo: File): Promise<Pet> => {
  const response = await generatedPostPetsPetPhotos(petId, { photo })
  return response as unknown as Pet
}

export const deletePetPhoto = async (
  petId: number,
  photoId: number | string = 'current'
): Promise<void> => {
  await generatedDeletePetsPetPhotosPhoto(petId, String(photoId))
}

export const setPrimaryPetPhoto = async (petId: number, photoId: number): Promise<Pet> => {
  const response = await generatedPostPetsPetPhotosPhotoSetPrimary(petId, String(photoId))
  return response as unknown as Pet
}

export const getPlacementRequests = async (): Promise<Pet[]> => {
  const response = await generatedGetPetsPlacementRequests()
  return response as unknown as Pet[]
}

export const getFeaturedPets = async (): Promise<Pet[]> => {
  const response = await generatedGetPetsFeatured()
  return response as unknown as Pet[]
}

export const getPetTypes = async (): Promise<PetType[]> => {
  const response = await generatedGetPetTypes()
  return response as unknown as PetType[]
}

// Weights API
export const getPetWeights = async (
  petId: number,
  page = 1
): Promise<{ data: WeightHistory[]; links: unknown; meta: unknown }> => {
  const response = await generatedGetPetsPetWeights(petId, { page })
  return response as any
}

export const createWeight = async (
  petId: number,
  payload: { weight_kg: number; record_date: string }
): Promise<WeightHistory> => {
  const response = await generatedPostPetsPetWeights(petId, payload)
  return response as unknown as WeightHistory
}

export const updateWeight = async (
  petId: number,
  weightId: number,
  payload: Partial<{ weight_kg: number; record_date: string }>
): Promise<WeightHistory> => {
  const response = await generatedPutPetsPetWeightsWeight(petId, weightId, payload)
  return response as unknown as WeightHistory
}

export const deleteWeight = async (petId: number, weightId: number): Promise<boolean> => {
  const response = await generatedDeletePetsPetWeightsWeight(petId, weightId)
  return true
}

// Medical Notes API
export const getMedicalNotes = async (
  petId: number,
  page = 1
): Promise<{ data: MedicalNote[]; links: unknown; meta: unknown }> => {
  const response = await generatedGetPetsPetMedicalNotes(petId, { page })
  return response as any
}

export const createMedicalNote = async (
  petId: number,
  payload: { note: string; record_date: string }
): Promise<MedicalNote> => {
  const response = await generatedPostPetsPetMedicalNotes(petId, payload)
  return response as unknown as MedicalNote
}

export const updateMedicalNote = async (
  petId: number,
  noteId: number,
  payload: Partial<{ note: string; record_date: string }>
): Promise<MedicalNote> => {
  const response = await generatedPutPetsPetMedicalNotesNote(petId, noteId, payload)
  return response as unknown as MedicalNote
}

export const deleteMedicalNote = async (petId: number, noteId: number): Promise<boolean> => {
  const response = await generatedDeletePetsPetMedicalNotesNote(petId, noteId)
  return true
}

// Vaccinations API
export type VaccinationStatus = 'active' | 'completed' | 'all'

export const getVaccinations = async (
  petId: number,
  page = 1,
  status: VaccinationStatus = 'active'
): Promise<{ data: VaccinationRecord[]; links: unknown; meta: unknown }> => {
  const response = await generatedGetPetsPetVaccinations(petId, {
    page,
    status: status as any,
  })
  return response as any
}

// Microchips API
export const getMicrochips = async (
  petId: number,
  page = 1
): Promise<{ data: PetMicrochip[]; links: unknown; meta: unknown }> => {
  const response = await generatedGetPetsPetMicrochips(petId, { page })
  return response as any
}

export const createMicrochip = async (
  petId: number,
  payload: { chip_number: string; issuer?: string | null; implanted_at?: string | null }
): Promise<PetMicrochip> => {
  const response = await generatedPostPetsPetMicrochips(petId, payload)
  return response as unknown as PetMicrochip
}

export const updateMicrochip = async (
  petId: number,
  microchipId: number,
  payload: Partial<{ chip_number: string; issuer?: string | null; implanted_at?: string | null }>
): Promise<PetMicrochip> => {
  const response = await generatedPutPetsPetMicrochipsMicrochip(petId, microchipId, payload)
  return response as unknown as PetMicrochip
}

export const deleteMicrochip = async (petId: number, microchipId: number): Promise<boolean> => {
  const response = await generatedDeletePetsPetMicrochipsMicrochip(petId, microchipId)
  return true
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
  const response = await generatedPostPetsPetVaccinations(petId, payload)
  return response as unknown as VaccinationRecord
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
  const response = await generatedPutPetsPetVaccinationsRecord(petId, recordId, payload)
  return response as unknown as VaccinationRecord
}

export const deleteVaccination = async (petId: number, recordId: number): Promise<boolean> => {
  const response = await generatedDeletePetsPetVaccinationsRecord(petId, recordId)
  return true
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
  const response = await generatedPostPetsPetVaccinationsRecordRenew(petId, recordId, payload)
  return response as unknown as VaccinationRecord
}

// Medical Records API
export const getMedicalRecords = async (
  petId: number,
  page = 1,
  recordType?: MedicalRecordType
): Promise<{ data: MedicalRecord[]; links: unknown; meta: unknown }> => {
  const response = await generatedGetPetsPetMedicalRecords(petId, {
    page,
    record_type: recordType as any,
  })
  return response as any
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
  const response = await generatedPostPetsPetMedicalRecords(petId, payload)
  return response as unknown as MedicalRecord
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
  const response = await generatedPutPetsPetMedicalRecordsRecord(petId, recordId, payload)
  return response as unknown as MedicalRecord
}

export const deleteMedicalRecord = async (petId: number, recordId: number): Promise<boolean> => {
  const response = await generatedDeletePetsPetMedicalRecordsRecord(petId, recordId)
  return true
}
