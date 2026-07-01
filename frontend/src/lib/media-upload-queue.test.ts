import { onlineManager } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { toast } from 'sonner'
import { uploadMedia } from './media-upload-service'
import {
  clearMediaUploadQueue,
  createPreviewUrl,
  enqueueUpload,
  enqueuePendingMedicalRecordPhoto,
  getPendingUploadCount,
  getPendingUploadsFor,
  listUploadsSnapshot,
  processQueue,
  promotePendingMedicalRecordPhotos,
  resetMediaUploadQueueForTests,
  subscribe,
} from './media-upload-queue'

vi.mock('./media-upload-service', () => ({
  uploadMedia: vi.fn(),
}))

const makeFile = (name = 'photo.jpg') => new File(['photo'], name, { type: 'image/jpeg' })

let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>

describe('media-upload-queue', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:queued-preview')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    onlineManager.setOnline(true)
    await resetMediaUploadQueueForTests()
  })

  it('enqueues and exposes a persisted pending upload with a preview URL', async () => {
    onlineManager.setOnline(false)

    const id = await enqueueUpload({
      target: { kind: 'pet-photo', petId: 1 },
      file: makeFile(),
    })

    const pending = getPendingUploadsFor({ kind: 'pet-photo', petId: 1 })

    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({ id, fileName: 'photo.jpg', status: 'queued' })
    expect(createPreviewUrl(id)).toBe('blob:queued-preview')
    expect(await getPendingUploadCount()).toBe(1)
  })

  it('processes queued uploads and removes them on success', async () => {
    vi.mocked(uploadMedia).mockResolvedValue({ id: 1 })
    onlineManager.setOnline(false)
    await enqueueUpload({
      target: { kind: 'pet-photo', petId: 1 },
      file: makeFile(),
    })

    onlineManager.setOnline(true)
    await processQueue()

    expect(uploadMedia).toHaveBeenCalledWith(
      { kind: 'pet-photo', petId: 1 },
      expect.any(File),
      expect.any(Function)
    )
    expect(await getPendingUploadCount()).toBe(0)
    expect(toast.success).toHaveBeenCalledWith('Photos uploaded', undefined)
  })

  it('keeps retryable failures queued without an error toast', async () => {
    vi.mocked(uploadMedia).mockRejectedValue(new Error('Network down'))
    onlineManager.setOnline(false)
    await enqueueUpload({
      target: { kind: 'pet-photo', petId: 1 },
      file: makeFile(),
    })

    onlineManager.setOnline(true)
    await processQueue()

    const pending = getPendingUploadsFor({ kind: 'pet-photo', petId: 1 })
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({ attempts: 1, status: 'queued' })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('keeps terminal failures persisted with error status', async () => {
    vi.mocked(uploadMedia).mockRejectedValue({
      response: { status: 422, data: { message: 'Invalid image' } },
    })
    onlineManager.setOnline(false)
    await enqueueUpload({
      target: { kind: 'pet-photo', petId: 1 },
      file: makeFile(),
    })

    onlineManager.setOnline(true)
    await processQueue()

    const pending = getPendingUploadsFor({ kind: 'pet-photo', petId: 1 })
    expect(await getPendingUploadCount()).toBe(0)
    expect(pending).toHaveLength(0)

    const failed = listUploadsSnapshot().filter((upload) => upload.status === 'error')
    expect(failed).toHaveLength(1)
    expect(failed[0]).toMatchObject({ lastError: 'Invalid image', status: 'error' })
    expect(toast.error).toHaveBeenCalledWith('Invalid image')
  })

  it('clearMediaUploadQueue removes queued uploads, revokes previews, and clears persisted state', async () => {
    onlineManager.setOnline(false)
    const id = await enqueueUpload({
      target: { kind: 'pet-photo', petId: 1 },
      file: makeFile(),
    })
    createPreviewUrl(id)

    const listener = vi.fn()
    subscribe(listener)
    listener.mockClear()

    await clearMediaUploadQueue()

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:queued-preview')
    expect(getPendingUploadsFor({ kind: 'pet-photo', petId: 1 })).toHaveLength(0)
    expect(await getPendingUploadCount()).toBe(0)
    expect(listener).toHaveBeenCalled()
  })

  it('keeps pending medical record photos parked until the record is promoted', async () => {
    onlineManager.setOnline(false)
    vi.mocked(uploadMedia).mockResolvedValue({ id: 1 })

    const id = await enqueuePendingMedicalRecordPhoto({
      petId: 1,
      localRecordId: 'local-record-1',
      file: makeFile(),
    })

    await processQueue()

    expect(uploadMedia).not.toHaveBeenCalled()
    expect(getPendingUploadsFor({ kind: 'medical-photo', petId: 1, recordId: 99 })).toHaveLength(0)
    expect(await getPendingUploadCount()).toBe(1)

    const promotedIds = await promotePendingMedicalRecordPhotos({
      petId: 1,
      localRecordId: 'local-record-1',
      recordId: 99,
    })

    expect(promotedIds).toEqual([id])

    onlineManager.setOnline(true)
    await processQueue()

    expect(uploadMedia).toHaveBeenCalledWith(
      { kind: 'medical-photo', petId: 1, recordId: 99 },
      expect.any(File),
      expect.any(Function)
    )
    expect(await getPendingUploadCount()).toBe(0)
  })
})
