import type { QueryClient } from '@tanstack/react-query'
import {
  getGetPetsPetMedicalRecordsQueryKey,
  getGetPetsPetVaccinationsQueryKey,
  getGetPetsPetWeightsQueryKey,
} from '@/api/generated/pets/pets'

export async function invalidatePetWeights(queryClient: QueryClient, petId: number) {
  await queryClient.invalidateQueries({ queryKey: getGetPetsPetWeightsQueryKey(petId) })
}

export async function invalidatePetVaccinations(queryClient: QueryClient, petId: number) {
  await queryClient.invalidateQueries({ queryKey: getGetPetsPetVaccinationsQueryKey(petId) })
}

export async function invalidatePetMedicalRecords(queryClient: QueryClient, petId: number) {
  await queryClient.invalidateQueries({ queryKey: getGetPetsPetMedicalRecordsQueryKey(petId) })
}

/** Invalidate all pet-scoped health record list queries. */
export async function invalidatePetHealthRecords(queryClient: QueryClient, petId: number) {
  await Promise.all([
    invalidatePetWeights(queryClient, petId),
    invalidatePetVaccinations(queryClient, petId),
    invalidatePetMedicalRecords(queryClient, petId),
  ])
}
