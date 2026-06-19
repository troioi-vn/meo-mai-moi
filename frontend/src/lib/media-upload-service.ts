import { api } from '@/api/axios'
import { postPetsPetPhotos } from '@/api/generated/pet-photos/pet-photos'
import {
  postPetsPetMedicalRecordsRecordPhotos,
  postPetsPetVaccinationsRecordPhoto,
} from '@/api/generated/pets/pets'
import { postUsersMeAvatar } from '@/api/generated/user-profile/user-profile'

export type UploadTarget =
  | { kind: 'pet-photo'; petId: number }
  | { kind: 'avatar' }
  | { kind: 'helper-photo'; helperProfileId: number }
  | { kind: 'medical-photo'; petId: number; recordId: number }
  | { kind: 'vaccination-photo'; petId: number; recordId: number }
  | { kind: 'chat-image'; chatId: number }

export type UploadProgressHandler = (progress: number) => void

export async function uploadMedia(
  target: UploadTarget,
  file: File,
  onProgress?: UploadProgressHandler
): Promise<unknown> {
  void onProgress

  switch (target.kind) {
    case 'pet-photo':
      return postPetsPetPhotos(target.petId, { photo: file })
    case 'avatar':
      return postUsersMeAvatar({ avatar: file })
    case 'medical-photo':
      return postPetsPetMedicalRecordsRecordPhotos(target.petId, target.recordId, { photo: file })
    case 'vaccination-photo':
      return postPetsPetVaccinationsRecordPhoto(target.petId, target.recordId, { photo: file })
    case 'chat-image': {
      const formData = new FormData()
      formData.append('type', 'image')
      formData.append('image', file)

      return api.post(`/msg/chats/${String(target.chatId)}/messages`, formData)
    }
    case 'helper-photo':
      throw new Error('Standalone helper photo uploads are not supported yet')
  }
}
