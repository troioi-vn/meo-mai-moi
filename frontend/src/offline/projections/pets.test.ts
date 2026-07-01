import { describe, expect, it } from 'vite-plus/test'
import type { Pet } from '@/types/pet'
import {
  getPetOfflineLocalEntityId,
  getPetOfflineOperationStatus,
  pendingPetNumericId,
  pendingPetToPet,
  projectPetDetail,
  projectPetSections,
} from './pets'

const basePet: Pet = {
  id: 1,
  name: 'Mochi',
  sex: 'female',
  birthday_precision: 'unknown',
  country: 'VN',
  description: 'Soft cat',
  status: 'active',
  user_id: 1,
  pet_type_id: 1,
}

describe('pet projections', () => {
  it('inserts pending creates ahead of owned pets', () => {
    const projected = projectPetSections(
      { owned: [basePet], fostering_active: [], fostering_past: [], transferred_away: [] },
      [
        {
          localEntityId: 'local-1',
          data: { name: 'Offline', description: 'Queued', country: 'VN' },
        },
      ],
      [],
      [],
      []
    )

    expect(projected?.owned).toHaveLength(2)
    const [pendingPet, serverPet] = projected?.owned ?? []
    expect(pendingPet?.name).toBe('Offline')
    expect(pendingPet?.id).toBe(pendingPetNumericId('local-1'))
    expect(pendingPet ? getPetOfflineLocalEntityId(pendingPet) : undefined).toBe('local-1')
    expect(serverPet?.id).toBe(1)
  })

  it('merges pending updates, marks them, and hides pending deletes', () => {
    const projected = projectPetSections(
      {
        owned: [basePet, { ...basePet, id: 2, name: 'Removed' }],
        fostering_active: [],
        fostering_past: [],
        transferred_away: [],
      },
      [],
      [{ petId: 1, data: { name: 'Updated' }, status: 'pending' }],
      [],
      [{ petId: 2 }]
    )

    expect(projected?.owned).toEqual([expect.objectContaining({ id: 1, name: 'Updated' })])
    const [updatedPet] = projected?.owned ?? []
    expect(updatedPet ? getPetOfflineOperationStatus(updatedPet) : undefined).toBe('pending')
  })

  it('projects detail view for offline-created pets', () => {
    const pending = {
      localEntityId: 'local-2',
      data: { name: 'Offline', description: 'Queued', country: 'VN', status: 'active' as const },
    }
    const petId = pendingPetNumericId('local-2')

    const projected = projectPetDetail(undefined, [pending], [], [], [], petId)

    expect(projected).toEqual(pendingPetToPet(pending))
  })
})
