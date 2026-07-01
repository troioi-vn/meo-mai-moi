export type { OfflineEntityMarker } from './types'
export { pendingLocalNumericId } from './local-id'
export {
  pendingMedicalRecordNumericId,
  pendingMedicalRecordToRecord,
  projectMedicalRecords,
  type ProjectedMedicalRecordCreate,
  type ProjectedMedicalRecordDelete,
  type ProjectedMedicalRecordUpdate,
} from './medical-records'
export {
  pendingWeightNumericId,
  pendingWeightToHistory,
  projectWeightHistory,
  type ProjectedWeightCreate,
  type ProjectedWeightDelete,
  type ProjectedWeightUpdate,
} from './weights'
export {
  pendingVaccinationNumericId,
  pendingVaccinationToRecord,
  projectVaccinations,
  type ProjectedVaccinationCreate,
  type ProjectedVaccinationDelete,
  type ProjectedVaccinationUpdate,
} from './vaccinations'
export { projectHabit, projectHabitHeatmapDays, type ProjectedHabitUpdate } from './habits'
export {
  findProjectedPetInSections,
  pendingPetNumericId,
  pendingPetToPet,
  projectPetDetail,
  projectPetSections,
  type PetSectionsResponse,
  type ProjectedPetCreate,
  type ProjectedPetDelete,
  type ProjectedPetStatusUpdate,
  type ProjectedPetUpdate,
} from './pets'
export {
  buildHabitDayMarkerMap,
  hasActiveDeleteForRecord,
  resolveHabitDayMarker,
  resolveMedicalRecordMarker,
  resolveRecordMarker,
  resolveVaccinationMarker,
  resolveWeightMarker,
} from './sync-state'
