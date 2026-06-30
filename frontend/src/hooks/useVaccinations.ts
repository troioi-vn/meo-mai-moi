import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetPetsPetVaccinations,
  usePostPetsPetVaccinations,
  usePutPetsPetVaccinationsRecord,
  useDeletePetsPetVaccinationsRecord,
  usePostPetsPetVaccinationsRecordRenew,
  usePostPetsPetVaccinationsRecordPhoto,
  useDeletePetsPetVaccinationsRecordPhoto,
  getGetPetsPetVaccinationsQueryKey,
} from '@/api/generated/pets/pets'
import type { VaccinationRecord } from '@/api/generated/model'
import type { GetPetsPetVaccinationsStatus as VaccinationStatus } from '@/api/generated/model'
import { useNetworkStatus } from '@/hooks/use-network-status'
import {
  enqueueOperation,
  isPendingVaccinationCreateOperation,
  isVaccinationCreatePayload,
  listOperations,
  subscribe,
  type OfflineOperation,
  type VaccinationCreatePayload,
} from '@/offline/operations'
import { generateQueueId } from '@/offline/queue-core'

const EMPTY_VACCINATION_RECORDS: VaccinationRecord[] = []

export type PendingVaccinationCreate = Omit<VaccinationCreatePayload, 'petId'> & {
  localEntityId: string
}

export interface UseVaccinationsResult {
  items: VaccinationRecord[]
  pendingCreates: PendingVaccinationCreate[]
  isPendingCreate: (id: number) => boolean
  loading: boolean
  error: string | null
  status: VaccinationStatus
  setStatus: (status: VaccinationStatus) => void
  create: (payload: {
    vaccine_name: string
    administered_at: string
    due_at?: string | null
    notes?: string | null
  }) => Promise<VaccinationRecord>
  update: (
    id: number,
    payload: Partial<{
      vaccine_name: string
      administered_at: string
      due_at?: string | null
      notes?: string | null
    }>
  ) => Promise<void>
  remove: (id: number) => Promise<void>
  renew: (
    id: number,
    payload: {
      vaccine_name: string
      administered_at: string
      due_at?: string | null
      notes?: string | null
    }
  ) => Promise<VaccinationRecord>
  reload: () => Promise<void>
  uploadPhoto: (recordId: number, file: File) => Promise<VaccinationRecord>
  deletePhoto: (recordId: number) => Promise<void>
}

function pendingVaccinationNumericId(localEntityId: string): number {
  let hash = 0
  for (let index = 0; index < localEntityId.length; index++) {
    hash = (Math.imul(31, hash) + localEntityId.charCodeAt(index)) | 0
  }

  if (hash === 0) return -1

  return hash > 0 ? -hash : hash
}

function operationToPendingVaccination(
  operation: OfflineOperation
): PendingVaccinationCreate | null {
  if (!isVaccinationCreatePayload(operation.payload)) return null

  const { petId: _petId, ...createPayload } = operation.payload

  return {
    localEntityId: operation.localEntityId ?? operation.id,
    ...createPayload,
  }
}

function pendingVaccinationToRecord(
  pending: PendingVaccinationCreate,
  petId: number
): VaccinationRecord {
  return {
    id: pendingVaccinationNumericId(pending.localEntityId),
    pet_id: petId,
    vaccine_name: pending.vaccine_name,
    administered_at: pending.administered_at,
    due_at: pending.due_at ?? undefined,
    notes: pending.notes ?? undefined,
    completed_at: null,
    photo_url: null,
  }
}

async function loadPendingVaccinationCreates(petId: number): Promise<PendingVaccinationCreate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isPendingVaccinationCreateOperation(operation, petId))
    .map((operation) => operationToPendingVaccination(operation))
    .filter((pending): pending is PendingVaccinationCreate => pending !== null)
}

export const useVaccinations = (
  petId: number,
  initialStatus: VaccinationStatus = 'active'
): UseVaccinationsResult => {
  const queryClient = useQueryClient()
  const isOnline = useNetworkStatus()
  const [status, setStatus] = useState<VaccinationStatus>(initialStatus)
  const [pendingCreates, setPendingCreates] = useState<PendingVaccinationCreate[]>([])

  const params = { page: 1, status }
  const {
    data: queryData,
    isLoading,
    isError,
  } = useGetPetsPetVaccinations(petId, params, {
    query: { enabled: petId > 0 },
  })

  useEffect(() => {
    if (petId <= 0) {
      setPendingCreates([])
      return
    }

    let cancelled = false

    const refreshPendingOperations = async () => {
      const nextPendingCreates = await loadPendingVaccinationCreates(petId)
      if (!cancelled) {
        setPendingCreates(nextPendingCreates)
      }
    }

    void refreshPendingOperations()

    const unsubscribe = subscribe(() => {
      void refreshPendingOperations()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [petId])

  const serverItems = useMemo(() => queryData?.data ?? EMPTY_VACCINATION_RECORDS, [queryData])
  const items = useMemo(() => {
    if (status !== 'active' && status !== 'all') {
      return serverItems
    }

    const pendingItems = pendingCreates.map((pending) => pendingVaccinationToRecord(pending, petId))
    return [...pendingItems, ...serverItems]
  }, [pendingCreates, petId, serverItems, status])

  const pendingCreateIds = useMemo(
    () =>
      new Set(pendingCreates.map((pending) => pendingVaccinationNumericId(pending.localEntityId))),
    [pendingCreates]
  )

  const isPendingCreate = useCallback((id: number) => pendingCreateIds.has(id), [pendingCreateIds])

  const loading = isLoading
  const error = isError ? 'Failed to load vaccinations' : null

  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: getGetPetsPetVaccinationsQueryKey(petId) })
  }, [queryClient, petId])

  const createMutation = usePostPetsPetVaccinations()
  const updateMutation = usePutPetsPetVaccinationsRecord()
  const deleteMutation = useDeletePetsPetVaccinationsRecord()
  const renewMutation = usePostPetsPetVaccinationsRecordRenew()
  const uploadPhotoMutation = usePostPetsPetVaccinationsRecordPhoto()
  const deletePhotoMutation = useDeletePetsPetVaccinationsRecordPhoto()

  const create = useCallback(
    async (payload: {
      vaccine_name: string
      administered_at: string
      due_at?: string | null
      notes?: string | null
    }): Promise<VaccinationRecord> => {
      if (!isOnline) {
        const localEntityId = generateQueueId()

        await enqueueOperation({
          idempotencyKey: localEntityId,
          entityType: 'vaccination',
          entityId: petId,
          operation: 'create',
          localEntityId,
          payload: {
            petId,
            vaccine_name: payload.vaccine_name,
            administered_at: payload.administered_at,
            due_at: payload.due_at ?? null,
            notes: payload.notes ?? null,
          },
        })

        const pending: PendingVaccinationCreate = {
          localEntityId,
          vaccine_name: payload.vaccine_name,
          administered_at: payload.administered_at,
          due_at: payload.due_at ?? null,
          notes: payload.notes ?? null,
        }

        return pendingVaccinationToRecord(pending, petId)
      }

      const created = await createMutation.mutateAsync({
        pet: petId,
        data: {
          vaccine_name: payload.vaccine_name,
          administered_at: payload.administered_at,
          due_at: payload.due_at ?? undefined,
          notes: payload.notes ?? undefined,
        },
      })
      await invalidate()
      return created
    },
    [createMutation, petId, invalidate, isOnline]
  )

  const update = useCallback(
    async (
      id: number,
      payload: Partial<{
        vaccine_name: string
        administered_at: string
        due_at?: string | null
        notes?: string | null
      }>
    ) => {
      await updateMutation.mutateAsync({
        pet: petId,
        record: id,
        data: {
          vaccine_name: payload.vaccine_name,
          administered_at: payload.administered_at,
          due_at: payload.due_at ?? undefined,
          notes: payload.notes ?? undefined,
        },
      })
      await invalidate()
    },
    [updateMutation, petId, invalidate]
  )

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync({ pet: petId, record: id })
      await invalidate()
    },
    [deleteMutation, petId, invalidate]
  )

  const renew = useCallback(
    async (
      id: number,
      payload: {
        vaccine_name: string
        administered_at: string
        due_at?: string | null
        notes?: string | null
      }
    ): Promise<VaccinationRecord> => {
      const newRecord = await renewMutation.mutateAsync({
        pet: petId,
        record: id,
        data: {
          vaccine_name: payload.vaccine_name,
          administered_at: payload.administered_at,
          due_at: payload.due_at ?? undefined,
          notes: payload.notes ?? undefined,
        },
      })
      await invalidate()
      return newRecord
    },
    [renewMutation, petId, invalidate]
  )

  const uploadPhoto = useCallback(
    async (recordId: number, file: File): Promise<VaccinationRecord> => {
      const updatedRecord = await uploadPhotoMutation.mutateAsync({
        pet: petId,
        record: recordId,
        data: { photo: file },
      })
      await invalidate()
      return updatedRecord
    },
    [uploadPhotoMutation, petId, invalidate]
  )

  const deletePhoto = useCallback(
    async (recordId: number): Promise<void> => {
      await deletePhotoMutation.mutateAsync({ pet: petId, record: recordId })
      await invalidate()
    },
    [deletePhotoMutation, petId, invalidate]
  )

  return {
    items,
    pendingCreates,
    isPendingCreate,
    loading,
    error,
    status,
    setStatus,
    create,
    update,
    remove,
    renew,
    reload: invalidate,
    uploadPhoto,
    deletePhoto,
  }
}
