import { clear, createStore, del, entries, set } from 'idb-keyval'
import { onlineManager } from '@tanstack/react-query'
import { toast } from '@/lib/i18n-toast'
import { queryClient } from '@/lib/query-cache'
import { uploadMedia, type UploadTarget } from '@/lib/media-upload-service'
import { invalidatePetMediaQueries } from '@/lib/pet-media-cache'
import { getGetPetsPetMedicalRecordsQueryKey } from '@/api/generated/pets/pets'
import {
  calculateBackoffMs,
  createListenerHub,
  generateQueueId,
  isRetryableHttpError,
  type QueueItemStatus,
} from '@/offline/queue-core'

interface PendingPetTarget {
  kind: 'pending-pet'
  localEntityId?: string
}

interface PendingMedicalRecordTarget {
  kind: 'pending-medical-record'
  petId: number
  localRecordId: string
}

export type QueueUploadTarget = UploadTarget | PendingPetTarget | PendingMedicalRecordTarget
export type PendingUploadStatus = QueueItemStatus

interface PendingUpload {
  id: string
  target: QueueUploadTarget
  fileName: string
  mimeType: string
  size: number
  blob: Blob
  createdAt: number
  attempts: number
  status: PendingUploadStatus
  progress?: number | null
  lastError?: string
}

export type PendingUploadView = Omit<PendingUpload, 'blob'>

const store = createStore('meo-media-uploads', 'items')
const uploads = new Map<string, PendingUpload>()
const previewUrls = new Map<string, string>()
const listenerHub = createListenerHub()
let initialized = false
let initializing: Promise<void> | null = null
let processing = false
let retryTimer: number | null = null

const toView = ({ blob: _blob, ...upload }: PendingUpload): PendingUploadView => upload

async function ensureInitialized() {
  if (initialized) return
  if (initializing) return initializing

  initializing = (async () => {
    const storedUploads = await entries<string, PendingUpload>(store)
    uploads.clear()
    for (const [id, upload] of storedUploads) {
      uploads.set(id, upload.status === 'uploading' ? { ...upload, status: 'queued' } : upload)
    }
    initialized = true
    listenerHub.notify()
  })()

  return initializing
}

const persistUpload = async (upload: PendingUpload) => {
  uploads.set(upload.id, upload)
  await set(upload.id, upload, store)
  listenerHub.notify()
}

const removeUploadInternal = async (id: string) => {
  uploads.delete(id)
  const previewUrl = previewUrls.get(id)
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrls.delete(id)
  }
  await del(id, store)
  listenerHub.notify()
}

const setUploadProgress = (id: string, progress: number | null) => {
  const upload = uploads.get(id)
  if (!upload) return

  uploads.set(id, { ...upload, progress })
  listenerHub.notify()
}

const targetMatches = (left: QueueUploadTarget, right: QueueUploadTarget) => {
  if (left.kind !== right.kind) return false

  switch (left.kind) {
    case 'pet-photo':
      return left.petId === (right as UploadTarget & { kind: 'pet-photo' }).petId
    case 'medical-photo':
    case 'vaccination-photo':
      return (
        left.petId === (right as UploadTarget & { kind: typeof left.kind }).petId &&
        left.recordId === (right as UploadTarget & { kind: typeof left.kind }).recordId
      )
    case 'helper-photo':
      return (
        left.helperProfileId === (right as UploadTarget & { kind: 'helper-photo' }).helperProfileId
      )
    case 'chat-image':
      return left.chatId === (right as UploadTarget & { kind: 'chat-image' }).chatId
    case 'avatar':
      return true
    case 'pending-pet':
      return (
        left.localEntityId === undefined ||
        (right as PendingPetTarget).localEntityId === undefined ||
        left.localEntityId === (right as PendingPetTarget).localEntityId
      )
    case 'pending-medical-record':
      return (
        left.petId === (right as PendingMedicalRecordTarget).petId &&
        left.localRecordId === (right as PendingMedicalRecordTarget).localRecordId
      )
  }
}

export const isRetryableUploadError = isRetryableHttpError

const uploadErrorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
  (error instanceof Error ? error.message : undefined)

const scheduleRetry = (attempts: number) => {
  if (!onlineManager.isOnline() || retryTimer !== null) return

  retryTimer = window.setTimeout(() => {
    retryTimer = null
    void processQueue()
  }, calculateBackoffMs(attempts))
}

const invalidateTarget = async (target: QueueUploadTarget) => {
  if (target.kind === 'pet-photo') {
    await invalidatePetMediaQueries(queryClient, target.petId)
    return
  }

  if (target.kind === 'medical-photo') {
    await queryClient.invalidateQueries({
      queryKey: getGetPetsPetMedicalRecordsQueryKey(target.petId),
    })
    return
  }

  if (target.kind === 'avatar' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meo-auth-refresh'))
  }
}

export async function enqueueUpload(input: { target: QueueUploadTarget; file: File }) {
  await ensureInitialized()

  const upload: PendingUpload = {
    id: generateQueueId(),
    target: input.target,
    fileName: input.file.name,
    mimeType: input.file.type,
    size: input.file.size,
    blob: input.file,
    createdAt: Date.now(),
    attempts: 0,
    status: 'queued',
  }

  await persistUpload(upload)
  void processQueue()

  return upload.id
}

export async function enqueuePendingPetPhoto(file: File, localEntityId?: string) {
  return enqueueUpload({ target: { kind: 'pending-pet', localEntityId }, file })
}

export async function enqueuePendingMedicalRecordPhoto(input: {
  petId: number
  localRecordId: string
  file: File
}) {
  return enqueueUpload({
    target: {
      kind: 'pending-medical-record',
      petId: input.petId,
      localRecordId: input.localRecordId,
    },
    file: input.file,
  })
}

export async function promotePendingPetPhoto(input: { petId: number; localEntityId: string }) {
  await ensureInitialized()

  const upload = [...uploads.values()]
    .filter(
      (item) =>
        item.target.kind === 'pending-pet' && item.target.localEntityId === input.localEntityId
    )
    .sort((left, right) => left.createdAt - right.createdAt)[0]

  if (!upload) return null

  const promoted: PendingUpload = {
    ...upload,
    target: { kind: 'pet-photo', petId: input.petId },
    status: 'queued',
    lastError: undefined,
  }

  await persistUpload(promoted)
  void processQueue()

  return promoted.id
}

/** @deprecated Use promotePendingPetPhoto with localEntityId for offline pet creates. */
export async function promoteNextPendingPetPhoto(petId: number) {
  await ensureInitialized()

  const upload = [...uploads.values()]
    .filter((item) => item.target.kind === 'pending-pet')
    .sort((left, right) => left.createdAt - right.createdAt)[0]

  if (!upload) return null

  const promoted: PendingUpload = {
    ...upload,
    target: { kind: 'pet-photo', petId },
    status: 'queued',
    lastError: undefined,
  }

  await persistUpload(promoted)
  void processQueue()

  return promoted.id
}

export async function promotePendingMedicalRecordPhotos(input: {
  petId: number
  localRecordId: string
  recordId: number
}) {
  await ensureInitialized()

  const promotedIds: string[] = []

  const pendingUploads = [...uploads.values()]
    .filter(
      (item) =>
        item.target.kind === 'pending-medical-record' &&
        item.target.petId === input.petId &&
        item.target.localRecordId === input.localRecordId
    )
    .sort((left, right) => left.createdAt - right.createdAt)

  for (const upload of pendingUploads) {
    const promoted: PendingUpload = {
      ...upload,
      target: {
        kind: 'medical-photo',
        petId: input.petId,
        recordId: input.recordId,
      },
      status: 'queued',
      lastError: undefined,
    }

    await persistUpload(promoted)
    promotedIds.push(promoted.id)
  }

  if (promotedIds.length > 0) {
    void processQueue()
  }

  return promotedIds
}

export async function getPendingUploadCount() {
  await ensureInitialized()
  return getPendingUploadCountSnapshot()
}

function isActiveUploadStatus(status: PendingUploadStatus) {
  return status === 'queued' || status === 'uploading'
}

export function getPendingUploadCountSnapshot() {
  let count = 0
  for (const upload of uploads.values()) {
    if (isActiveUploadStatus(upload.status)) {
      count++
    }
  }
  return count
}

export function getQueuedUploadCountSnapshot() {
  let count = 0
  for (const upload of uploads.values()) {
    if (upload.status === 'queued') {
      count++
    }
  }
  return count
}

export function getUploadingCountSnapshot() {
  let count = 0
  for (const upload of uploads.values()) {
    if (upload.status === 'uploading') {
      count++
    }
  }
  return count
}

export function getFailedUploadCountSnapshot() {
  let count = 0
  for (const upload of uploads.values()) {
    if (upload.status === 'error') {
      count++
    }
  }
  return count
}

export function listUploadsSnapshot(): PendingUploadView[] {
  return [...uploads.values()].sort((left, right) => left.createdAt - right.createdAt).map(toView)
}

export function getPendingUploadsFor(target: QueueUploadTarget): PendingUploadView[] {
  return [...uploads.values()]
    .filter((upload) => upload.status !== 'error' && targetMatches(upload.target, target))
    .sort((left, right) => left.createdAt - right.createdAt)
    .map(toView)
}

export function subscribe(listener: () => void) {
  void ensureInitialized()

  return listenerHub.subscribe(listener)
}

export function createPreviewUrl(id: string) {
  const existing = previewUrls.get(id)
  if (existing) return existing

  const upload = uploads.get(id)
  if (!upload) return ''

  const previewUrl = URL.createObjectURL(upload.blob)
  previewUrls.set(id, previewUrl)
  return previewUrl
}

export async function removeUpload(id: string) {
  await ensureInitialized()
  await removeUploadInternal(id)
}

export async function retryUpload(id: string) {
  await ensureInitialized()
  const upload = uploads.get(id)
  if (upload?.status !== 'error') return

  await persistUpload({ ...upload, status: 'queued', lastError: undefined, progress: null })
  void processQueue()
}

export async function processQueue() {
  await ensureInitialized()
  if (processing || !onlineManager.isOnline()) return

  processing = true
  let syncedCount = 0

  try {
    while (onlineManager.isOnline()) {
      const upload = [...uploads.values()]
        .filter(
          (item) =>
            item.status === 'queued' &&
            item.target.kind !== 'pending-pet' &&
            item.target.kind !== 'pending-medical-record'
        )
        .sort((left, right) => left.createdAt - right.createdAt)[0]

      if (!upload) break

      await persistUpload({ ...upload, status: 'uploading', progress: 0, lastError: undefined })

      try {
        const file = new File([upload.blob], upload.fileName, { type: upload.mimeType })
        await uploadMedia(upload.target as UploadTarget, file, (progress) => {
          setUploadProgress(upload.id, progress)
        })
        await removeUploadInternal(upload.id)
        await invalidateTarget(upload.target)
        syncedCount += 1
      } catch (error) {
        const attempts = upload.attempts + 1
        const lastError = uploadErrorMessage(error)

        if (isRetryableUploadError(error)) {
          await persistUpload({ ...upload, attempts, status: 'queued', progress: null, lastError })
          scheduleRetry(attempts)
          break
        }

        await persistUpload({ ...upload, attempts, status: 'error', progress: null, lastError })
        if (lastError) {
          toast.raw.error(lastError)
        } else {
          toast.error('media:upload.failedPermanent')
        }
      }
    }
  } finally {
    processing = false
  }

  if (syncedCount > 0) {
    toast.success('media:upload.synced')
  }
}

export function setupMediaUploadQueue() {
  void ensureInitialized().then(() => processQueue())
  onlineManager.subscribe((isOnline) => {
    if (isOnline) {
      void processQueue()
    }
  })
}

async function clearQueueState(options: { clearListeners: boolean }) {
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer)
    retryTimer = null
  }
  for (const previewUrl of previewUrls.values()) {
    URL.revokeObjectURL(previewUrl)
  }
  previewUrls.clear()
  uploads.clear()
  if (options.clearListeners) {
    listenerHub.clear()
  }
  initialized = false
  initializing = null
  processing = false
  await clear(store)
  listenerHub.notify()
}

async function awaitQueueInitialization() {
  if (!initializing) return

  try {
    await initializing
  } catch {
    // Prior init failed; continue with clear.
  }
}

export async function clearMediaUploadQueue() {
  await awaitQueueInitialization()
  await clearQueueState({ clearListeners: false })
}

export async function resetMediaUploadQueueForTests() {
  await awaitQueueInitialization()
  await clearQueueState({ clearListeners: true })
}
