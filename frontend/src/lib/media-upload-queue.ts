import { clear, createStore, del, entries, set } from 'idb-keyval'
import { onlineManager } from '@tanstack/react-query'
import { toast } from '@/lib/i18n-toast'
import { queryClient } from '@/lib/query-cache'
import { uploadMedia, type UploadTarget } from '@/lib/media-upload-service'
import { invalidatePetMediaQueries } from '@/lib/pet-media-cache'

interface PendingPetTarget {
  kind: 'pending-pet'
}
type QueueUploadTarget = UploadTarget | PendingPetTarget
export type PendingUploadStatus = 'queued' | 'uploading' | 'error'

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
const listeners = new Set<() => void>()
let initialized = false
let initializing: Promise<void> | null = null
let processing = false
let retryTimer: number | null = null

const notify = () => {
  for (const listener of listeners) {
    listener()
  }
}

const toView = ({ blob: _blob, ...upload }: PendingUpload): PendingUploadView => upload

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

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
    notify()
  })()

  return initializing
}

const persistUpload = async (upload: PendingUpload) => {
  uploads.set(upload.id, upload)
  await set(upload.id, upload, store)
  notify()
}

const removeUploadInternal = async (id: string) => {
  uploads.delete(id)
  const previewUrl = previewUrls.get(id)
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrls.delete(id)
  }
  await del(id, store)
  notify()
}

const setUploadProgress = (id: string, progress: number | null) => {
  const upload = uploads.get(id)
  if (!upload) return

  uploads.set(id, { ...upload, progress })
  notify()
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
    case 'pending-pet':
      return true
  }
}

export function isRetryableUploadError(error: unknown) {
  const status = (error as { response?: { status?: number } }).response?.status
  if (status === undefined) return true
  return status === 408 || status === 429 || status >= 500
}

const uploadErrorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
  (error instanceof Error ? error.message : undefined)

const backoffMs = (attempts: number) => {
  const base = Math.min(30_000, 1000 * 2 ** Math.max(0, attempts - 1))
  return base + Math.floor(Math.random() * 500)
}

const scheduleRetry = (attempts: number) => {
  if (!onlineManager.isOnline() || retryTimer !== null) return

  retryTimer = window.setTimeout(() => {
    retryTimer = null
    void processQueue()
  }, backoffMs(attempts))
}

const invalidateTarget = async (target: QueueUploadTarget) => {
  if (target.kind === 'pet-photo') {
    await invalidatePetMediaQueries(queryClient, target.petId)
    return
  }

  if (target.kind === 'avatar' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meo-auth-refresh'))
  }
}

export async function enqueueUpload(input: { target: QueueUploadTarget; file: File }) {
  await ensureInitialized()

  const upload: PendingUpload = {
    id: generateId(),
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

export async function enqueuePendingPetPhoto(file: File) {
  return enqueueUpload({ target: { kind: 'pending-pet' }, file })
}

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

export async function getPendingUploadCount() {
  await ensureInitialized()
  return uploads.size
}

export function getPendingUploadCountSnapshot() {
  return uploads.size
}

export function getPendingUploadsFor(target: QueueUploadTarget): PendingUploadView[] {
  return [...uploads.values()]
    .filter((upload) => upload.status !== 'error' && targetMatches(upload.target, target))
    .sort((left, right) => left.createdAt - right.createdAt)
    .map(toView)
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  void ensureInitialized()

  return () => {
    listeners.delete(listener)
  }
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
  if (!upload) return

  await persistUpload({ ...upload, status: 'queued', lastError: undefined })
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
        .filter((item) => item.status === 'queued' && item.target.kind !== 'pending-pet')
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

        await persistUpload({ ...upload, attempts, status: 'error', lastError })
        await removeUploadInternal(upload.id)
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

export async function resetMediaUploadQueueForTests() {
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer)
    retryTimer = null
  }
  for (const previewUrl of previewUrls.values()) {
    URL.revokeObjectURL(previewUrl)
  }
  previewUrls.clear()
  uploads.clear()
  listeners.clear()
  initialized = false
  initializing = null
  processing = false
  await clear(store)
}
