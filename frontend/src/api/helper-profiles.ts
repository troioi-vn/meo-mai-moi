import { api } from './axios';

export const getHelperProfiles = async () => {
  const response = await api.get('/helper-profiles');
  return response.data;
};

export const getHelperProfile = async (id: string) => {
    const response = await api.get(`/helper-profiles/${id}`);
    return response.data;
}

export const createHelperProfile = async (data: any) => {
  const response = await api.post('/helper-profiles', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateHelperProfile = async ({ id, data }: { id: string, data: any }) => {
    const response = await api.put(`/helper-profiles/${id}`, data, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
}

export const deleteHelperProfile = async (id: string) => {
    const response = await api.delete(`/helper-profiles/${id}`);
    return response.data;
}
