export type QueueItemStatus = 'queued' | 'uploading' | 'error'

export interface QueueItemBase {
  id: string
  createdAt: number
  attempts: number
  status: QueueItemStatus
  lastError?: string
}
