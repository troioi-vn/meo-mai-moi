import {
  isPetDeletePayload,
  isPetStatusUpdatePayload,
  isPetUpdatePayload,
  listOperations,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { pendingPetNumericId } from '@/offline/projections/pets'

function patchPayloadPetId(
  operation: OfflineOperation,
  localNumericId: number,
  serverPetId: number
): Record<string, unknown> | null {
  if (!operation.payload || typeof operation.payload !== 'object') {
    return null
  }

  if (isPetUpdatePayload(operation.payload) && operation.payload.petId === localNumericId) {
    return { ...operation.payload, petId: serverPetId }
  }

  if (isPetStatusUpdatePayload(operation.payload) && operation.payload.petId === localNumericId) {
    return { ...operation.payload, petId: serverPetId }
  }

  if (isPetDeletePayload(operation.payload) && operation.payload.petId === localNumericId) {
    return { petId: serverPetId }
  }

  const payload = operation.payload as { petId?: number }
  if (payload.petId === localNumericId) {
    return { ...operation.payload, petId: serverPetId }
  }

  return null
}

export async function remapPetLocalId(localEntityId: string, serverPetId: number): Promise<void> {
  const localNumericId = pendingPetNumericId(localEntityId)
  const operations = await listOperations()

  for (const operation of operations) {
    const patches: Parameters<typeof updateOperation>[1] = {}

    if (operation.entityType === 'pet') {
      if (
        operation.localEntityId === localEntityId ||
        String(operation.entityId) === localEntityId
      ) {
        patches.entityId = serverPetId
      }

      const nextPayload = patchPayloadPetId(operation, localNumericId, serverPetId)
      if (nextPayload) {
        patches.payload = nextPayload
      }
    } else if (String(operation.entityId) === String(localNumericId)) {
      patches.entityId = serverPetId
    } else {
      const nextPayload = patchPayloadPetId(operation, localNumericId, serverPetId)
      if (nextPayload) {
        patches.payload = nextPayload
      }
    }

    if (Object.keys(patches).length > 0) {
      await updateOperation(operation.id, patches)
    }
  }
}
