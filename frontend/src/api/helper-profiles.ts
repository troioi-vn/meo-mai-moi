import {
  getHelperProfiles as generatedGetHelperProfiles,
  getHelperProfilesId as generatedGetHelperProfilesId,
  postHelperProfiles as generatedPostHelperProfiles,
  postHelperProfilesId as generatedPostHelperProfilesId,
  deleteHelperProfilesId as generatedDeleteHelperProfilesId,
  postHelperProfilesIdArchive as generatedPostHelperProfilesIdArchive,
  postHelperProfilesIdRestore as generatedPostHelperProfilesIdRestore,
  deleteHelperProfilesHelperProfilePhotosPhoto as generatedDeletePhoto,
} from './generated/helper-profiles/helper-profiles'
import { getTransferRequestsIdResponderProfile as generatedGetResponderProfile } from './generated/transfer-requests/transfer-requests'
import type { HelperProfile } from '../types/helper-profile'

export const getHelperProfiles = async (): Promise<HelperProfile[]> => {
  const response = await generatedGetHelperProfiles()
  return response as unknown as HelperProfile[]
}

export const getHelperProfile = async (id: string): Promise<HelperProfile> => {
  const response = await generatedGetHelperProfilesId(Number(id))
  return response as unknown as HelperProfile
}

export const createHelperProfile = async (data: FormData): Promise<HelperProfile> => {
  const response = await generatedPostHelperProfiles(
    data as unknown as Parameters<typeof generatedPostHelperProfiles>[0]
  )
  return response as unknown as HelperProfile
}

export const updateHelperProfile = async ({
  id,
  data,
}: {
  id: string | number
  data: FormData
}): Promise<HelperProfile> => {
  // postHelperProfilesId is used for multipart updates since Laravel doesn't handle PUT with multipart well
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const response = await generatedPostHelperProfilesId(
    Number(id),
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    data as unknown as Parameters<typeof generatedPostHelperProfilesId>[1]
  )
  return response as unknown as HelperProfile
}

export const deleteHelperProfile = async (id: string): Promise<void> => {
  await generatedDeleteHelperProfilesId(Number(id))
}

export const archiveHelperProfile = async (id: string): Promise<HelperProfile> => {
  const response = await generatedPostHelperProfilesIdArchive(Number(id))
  return response as unknown as HelperProfile
}

export const restoreHelperProfile = async (id: string): Promise<HelperProfile> => {
  const response = await generatedPostHelperProfilesIdRestore(Number(id))
  return response as unknown as HelperProfile
}

export const deleteHelperProfilePhoto = async (
  profileId: string,
  photoId: number
): Promise<void> => {
  await generatedDeletePhoto(Number(profileId), photoId)
}

// Owner-only fetch: get the responder's helper profile for a transfer request
export const getResponderHelperProfile = async (
  transferRequestId: number
): Promise<HelperProfile> => {
  const response = await generatedGetResponderProfile(transferRequestId)
  return response as unknown as HelperProfile
}
