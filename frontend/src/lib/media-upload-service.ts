import type { AxiosProgressEvent } from 'axios'
import { api } from '@/api/axios'

export type UploadTarget =
  | { kind: 'pet-photo'; petId: number }
  | { kind: 'avatar' }
  | { kind: 'helper-photo'; helperProfileId: number }
  | { kind: 'medical-photo'; petId: number; recordId: number }
  | { kind: 'vaccination-photo'; petId: number; recordId: number }
  | { kind: 'chat-image'; chatId: number }

export type UploadProgressHandler = (progress: number) => void

const progressConfig = (onProgress?: UploadProgressHandler) => ({
  onUploadProgress: (event: AxiosProgressEvent) => {
    if (!onProgress || !event.total) return
    onProgress(Math.round((event.loaded / event.total) * 100))
  },
})

const postMultipart = <T>(
  url: string,
  fieldName: string,
  file: File,
  onProgress?: UploadProgressHandler
) => {
  const formData = new FormData()
  formData.append(fieldName, file)

  return api.post<T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...progressConfig(onProgress),
  })
}

export async function uploadMedia(
  target: UploadTarget,
  file: File,
  onProgress?: UploadProgressHandler
): Promise<unknown> {
  switch (target.kind) {
    case 'pet-photo':
      return postMultipart(`/pets/${String(target.petId)}/photos`, 'photo', file, onProgress)
    case 'avatar':
      return postMultipart('/users/me/avatar', 'avatar', file, onProgress)
    case 'medical-photo':
      return postMultipart(
        `/pets/${String(target.petId)}/medical-records/${String(target.recordId)}/photos`,
        'photo',
        file,
        onProgress
      )
    case 'vaccination-photo':
      return postMultipart(
        `/pets/${String(target.petId)}/vaccinations/${String(target.recordId)}/photo`,
        'photo',
        file,
        onProgress
      )
    case 'chat-image': {
      const formData = new FormData()
      formData.append('type', 'image')
      formData.append('image', file)

      return api.post(`/msg/chats/${String(target.chatId)}/messages`, formData, {
        ...progressConfig(onProgress),
      })
    }
    case 'helper-photo':
      throw new Error('Standalone helper photo uploads are not supported yet')
  }
}
