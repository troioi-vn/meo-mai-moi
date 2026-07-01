import { useEffect, useMemo, useState } from 'react'
import { useGetMyPetsSections, useGetPetsId } from '@/api/generated/pets/pets'
import type { Pet } from '@/types/pet'
import {
  isPetCreatePayload,
  isPetDeletePayload,
  isPetStatusUpdatePayload,
  isPetUpdatePayload,
  listOperations,
  subscribe,
  type OfflineOperation,
} from '@/offline/operations'
import type { OfflineOperationStatus } from '@/offline/operations/types'
import {
  findProjectedPetInSections,
  pendingPetNumericId,
  projectPetDetail,
  projectPetSections,
  type PetSectionsResponse,
  type ProjectedPetCreate,
  type ProjectedPetDelete,
  type ProjectedPetStatusUpdate,
  type ProjectedPetUpdate,
} from '@/offline/projections/pets'

const PROJECTABLE_OPERATION_STATUSES = new Set<OfflineOperationStatus>([
  'pending',
  'syncing',
  'failed',
  'conflicted',
])

function isProjectablePetOperation(operation: OfflineOperation): boolean {
  return operation.entityType === 'pet' && PROJECTABLE_OPERATION_STATUSES.has(operation.status)
}

function operationToPendingPetCreate(operation: OfflineOperation): ProjectedPetCreate | null {
  if (operation.operation !== 'create' || !isPetCreatePayload(operation.payload)) {
    return null
  }

  return {
    localEntityId: operation.localEntityId ?? operation.id,
    status: operation.status,
    data: operation.payload as Partial<Pet>,
  }
}

function operationToPendingPetUpdate(operation: OfflineOperation): ProjectedPetUpdate | null {
  if (!isPetUpdatePayload(operation.payload)) return null

  return {
    petId: operation.payload.petId,
    status: operation.status,
    data: operation.payload.data as Partial<Pet>,
  }
}

function operationToPendingPetStatusUpdate(
  operation: OfflineOperation
): ProjectedPetStatusUpdate | null {
  if (!isPetStatusUpdatePayload(operation.payload)) return null

  return {
    petId: operation.payload.petId,
    petStatus: operation.payload.status,
    status: operation.status,
  }
}

function operationToPendingPetDelete(operation: OfflineOperation): ProjectedPetDelete | null {
  if (!isPetDeletePayload(operation.payload)) return null

  return {
    petId: operation.payload.petId,
    status: operation.status,
  }
}

async function loadProjectablePetOperations(): Promise<OfflineOperation[]> {
  const operations = await listOperations()
  return operations.filter(isProjectablePetOperation)
}

function splitPetOperations(operations: OfflineOperation[]) {
  const pendingCreates: ProjectedPetCreate[] = []
  const pendingUpdates: ProjectedPetUpdate[] = []
  const pendingStatusUpdates: ProjectedPetStatusUpdate[] = []
  const pendingDeletes: ProjectedPetDelete[] = []

  for (const operation of operations) {
    if (operation.operation === 'create') {
      const pendingCreate = operationToPendingPetCreate(operation)
      if (pendingCreate) pendingCreates.push(pendingCreate)
      continue
    }

    if (operation.operation === 'update' && isPetStatusUpdatePayload(operation.payload)) {
      const pendingStatus = operationToPendingPetStatusUpdate(operation)
      if (pendingStatus) pendingStatusUpdates.push(pendingStatus)
      continue
    }

    if (operation.operation === 'update') {
      const pendingUpdate = operationToPendingPetUpdate(operation)
      if (pendingUpdate) pendingUpdates.push(pendingUpdate)
      continue
    }

    const pendingDelete = operationToPendingPetDelete(operation)
    if (pendingDelete) pendingDeletes.push(pendingDelete)
  }

  return { pendingCreates, pendingUpdates, pendingStatusUpdates, pendingDeletes }
}

export function useProjectedPetSections(sectionsQuery: ReturnType<typeof useGetMyPetsSections>) {
  const [operations, setOperations] = useState<OfflineOperation[]>([])

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const nextOperations = await loadProjectablePetOperations()
      if (!cancelled) {
        setOperations(nextOperations)
      }
    }

    void refresh()

    const unsubscribe = subscribe(() => {
      void refresh()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const projectedData = useMemo(() => {
    if (!sectionsQuery.data && operations.length === 0) {
      return sectionsQuery.data
    }

    const { pendingCreates, pendingUpdates, pendingStatusUpdates, pendingDeletes } =
      splitPetOperations(operations)

    return projectPetSections(
      sectionsQuery.data as PetSectionsResponse | undefined,
      pendingCreates,
      pendingUpdates,
      pendingStatusUpdates,
      pendingDeletes
    )
  }, [operations, sectionsQuery.data])

  return {
    ...sectionsQuery,
    data: projectedData,
    pendingPetOperations: operations,
  }
}

export function useProjectedPet(petId: number) {
  const serverQuery = useGetPetsId(petId, {
    query: { enabled: petId > 0 },
  })
  const sectionsQuery = useGetMyPetsSections({
    query: { enabled: petId < 0 },
  })
  const [operations, setOperations] = useState<OfflineOperation[]>([])

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const nextOperations = await loadProjectablePetOperations()
      if (!cancelled) {
        setOperations(nextOperations)
      }
    }

    void refresh()

    const unsubscribe = subscribe(() => {
      void refresh()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const projectedSections = useMemo(() => {
    const { pendingCreates, pendingUpdates, pendingStatusUpdates, pendingDeletes } =
      splitPetOperations(operations)

    return projectPetSections(
      sectionsQuery.data as PetSectionsResponse | undefined,
      pendingCreates,
      pendingUpdates,
      pendingStatusUpdates,
      pendingDeletes
    )
  }, [operations, sectionsQuery.data])

  const pet = useMemo(() => {
    const { pendingCreates, pendingUpdates, pendingStatusUpdates, pendingDeletes } =
      splitPetOperations(operations)

    const serverPet = serverQuery.data as Pet | undefined
    const projected = projectPetDetail(
      serverPet,
      pendingCreates,
      pendingUpdates,
      pendingStatusUpdates,
      pendingDeletes,
      petId
    )

    if (projected) {
      return projected
    }

    return findProjectedPetInSections(projectedSections, petId)
  }, [operations, petId, projectedSections, serverQuery.data])

  const isPendingCreate = useMemo(
    () =>
      operations.some(
        (operation) =>
          operation.operation === 'create' &&
          pendingPetNumericId(operation.localEntityId ?? operation.id) === petId
      ),
    [operations, petId]
  )

  return {
    pet,
    isPendingCreate,
    isLoading:
      pet !== undefined
        ? false
        : petId > 0
          ? serverQuery.isLoading
          : petId < 0
            ? sectionsQuery.isLoading
            : false,
    isFetching: petId > 0 ? serverQuery.isFetching : petId < 0 ? sectionsQuery.isFetching : false,
    isError: petId > 0 ? serverQuery.isError : false,
    error: petId > 0 ? serverQuery.error : undefined,
    refetch: petId > 0 ? serverQuery.refetch : sectionsQuery.refetch,
  }
}
