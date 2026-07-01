export type OfflineOperationStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflicted'

export type OfflineEntityType = 'pet' | 'weight' | 'vaccination' | 'medical_record' | 'habit'

export type OfflineOperationType = 'create' | 'update' | 'delete'

export interface OperationConflictMetadata {
  localAttemptedValue: unknown
  serverValue?: unknown
  clientBaseVersion?: string
  serverVersion?: string
  operationId: string
  idempotencyKey: string
}

export interface OfflineOperation {
  id: string
  idempotencyKey: string
  entityType: OfflineEntityType
  entityId: string | number
  localEntityId?: string
  operation: OfflineOperationType
  payload: unknown
  baseVersion?: string
  conflictMetadata?: OperationConflictMetadata
  status: OfflineOperationStatus
  attempts: number
  createdAt: number
  updatedAt: number
  lastError?: string
}

export type EnqueueOperationInput = Pick<
  OfflineOperation,
  'idempotencyKey' | 'entityType' | 'entityId' | 'operation' | 'payload'
> &
  Partial<Pick<OfflineOperation, 'localEntityId' | 'baseVersion'>>

export type OfflineOperationPatch = Partial<
  Pick<
    OfflineOperation,
    | 'status'
    | 'attempts'
    | 'lastError'
    | 'entityId'
    | 'localEntityId'
    | 'baseVersion'
    | 'conflictMetadata'
    | 'payload'
    | 'idempotencyKey'
  >
>
