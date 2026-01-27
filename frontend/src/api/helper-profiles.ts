import { api } from './axios'
import type { HelperProfile } from '../types/helper-profile'

export const getHelperProfiles = async (): Promise<HelperProfile[]> => {
  return await api.get<HelperProfile[]>('/helper-profiles')
}

export const getHelperProfile = async (id: string): Promise<HelperProfile> => {
  return await api.get<HelperProfile>(`/helper-profiles/${id}`)
}

export const createHelperProfile = async (data: FormData): Promise<HelperProfile> => {
  return await api.post<HelperProfile>('/helper-profiles', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const updateHelperProfile = async ({
  id,
  data,
}: {
  id: string | number
  data: FormData
}): Promise<HelperProfile> => {
  return await api.post<HelperProfile>(`/helper-profiles/${String(id)}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const deleteHelperProfile = async (id: string): Promise<void> => {
  await api.delete(`/helper-profiles/${id}`)
}

export const archiveHelperProfile = async (id: string): Promise<HelperProfile> => {
  return await api.post<HelperProfile>(`/helper-profiles/${id}/archive`)
}

export const restoreHelperProfile = async (id: string): Promise<HelperProfile> => {
  return await api.post<HelperProfile>(`/helper-profiles/${id}/restore`)
}

export const deleteHelperProfilePhoto = async (
  profileId: string,
  photoId: number
): Promise<void> => {
  await api.delete(`/helper-profiles/${profileId}/photos/${String(photoId)}`)
}

// Owner-only fetch: get the responder's helper profile for a transfer request
export const getResponderHelperProfile = async (
  transferRequestId: number
): Promise<HelperProfile> => {
  return await api.get<HelperProfile>(
    `/transfer-requests/${String(transferRequestId)}/responder-profile`
  )
}
