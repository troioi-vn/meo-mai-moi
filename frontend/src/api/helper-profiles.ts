import { api } from './axios';
import type { HelperProfile } from '../types/helper-profile';

interface HelperProfileResponse {
  data: HelperProfile;
}

interface HelperProfilesResponse {
    data: HelperProfile[];
}

export const getHelperProfiles = async (): Promise<HelperProfilesResponse> => {
  const response = await api.get<HelperProfilesResponse>('/helper-profiles');
  return response.data;
};

export const getHelperProfile = async (id: string): Promise<HelperProfileResponse> => {
    const response = await api.get<HelperProfileResponse>(`/helper-profiles/${id}`);
    return response.data;
}

export const createHelperProfile = async (data: FormData): Promise<HelperProfileResponse> => {
  const response = await api.post<HelperProfileResponse>('/helper-profiles', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateHelperProfile = async ({ id, data }: { id: string | number; data: FormData }): Promise<HelperProfileResponse> => {
  const response = await api.post<HelperProfileResponse>(`/helper-profiles/${String(id)}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteHelperProfile = async (id: string): Promise<void> => {
    await api.delete(`/helper-profiles/${id}`);
}

export const deleteHelperProfilePhoto = async (profileId: string, photoId: number): Promise<void> => {
    await api.delete(`/helper-profiles/${profileId}/photos/${String(photoId)}`);
}

// Owner-only fetch: get the responder's helper profile for a transfer request
export const getResponderHelperProfile = async (transferRequestId: number): Promise<HelperProfile> => {
  const res = await api.get<{ data: HelperProfile }>(`/transfer-requests/${String(transferRequestId)}/responder-profile`)
  return res.data.data
}
