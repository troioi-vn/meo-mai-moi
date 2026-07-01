import type { OfflineOperationStatus } from '@/offline/operations/types'

export type OfflineEntityMarker = 'pending' | 'failed' | 'conflicted'

export interface ProjectedOfflineStatus {
  status?: OfflineOperationStatus
}
