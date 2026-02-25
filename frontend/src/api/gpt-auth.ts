import { api, csrf } from '@/api/axios'

export interface GptSessionPayload {
  session_id: string
  session_sig: string
}

export interface GptRegisterPayload extends GptSessionPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface GptConfirmResponse {
  redirect_url: string
}

export const confirmGptConnect = async (
  payload: GptSessionPayload
): Promise<GptConfirmResponse> => {
  return api.post<GptConfirmResponse>('/gpt-auth/confirm', payload)
}

export const registerViaGptConnect = async (payload: GptRegisterPayload) => {
  await csrf()
  return api.post('/gpt-auth/register', payload)
}
