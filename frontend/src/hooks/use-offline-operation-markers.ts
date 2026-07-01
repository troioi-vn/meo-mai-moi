import { useEffect, useMemo, useState } from 'react'
import { listOperations, subscribe } from '@/offline/operations'
import type { OfflineEntityMarker } from '@/offline/projections'
import { resolveHabitDayMarker, resolveRecordMarker } from '@/offline/projections'

export function useOfflineOperationsSnapshot() {
  const [operations, setOperations] = useState<Awaited<ReturnType<typeof listOperations>>>([])

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const next = await listOperations()
      if (!cancelled) {
        setOperations(next)
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

  return operations
}

export function useOfflineRecordMarker(
  entityType: 'weight' | 'vaccination' | 'medical_record',
  petId: number,
  recordId: number | null | undefined
): OfflineEntityMarker | null {
  const operations = useOfflineOperationsSnapshot()

  return useMemo(() => {
    if (recordId == null || petId <= 0) {
      return null
    }

    return resolveRecordMarker(entityType, recordId, petId, operations)
  }, [entityType, operations, petId, recordId])
}

export function useOfflineHabitDayMarker(
  habitId: number | null | undefined,
  date: string | null | undefined
): OfflineEntityMarker | null {
  const operations = useOfflineOperationsSnapshot()

  return useMemo(() => {
    if (!habitId || !date) {
      return null
    }

    return resolveHabitDayMarker(habitId, date, operations)
  }, [date, habitId, operations])
}
