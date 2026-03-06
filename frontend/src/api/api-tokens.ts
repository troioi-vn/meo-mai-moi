import { api } from '@/api/axios'

export interface ApiTokenItem {
  id: number
  name: string
  abilities: string[]
  created_at: string | null
  last_used_at: string | null
  last_used_ago: string | null
}

export interface ApiTokensIndexResponse {
  tokens: ApiTokenItem[]
  available_permissions: string[]
  default_permissions: string[]
}

export interface CreateApiTokenResponse {
  token: ApiTokenItem
  plain_text_token: string
}

export const listApiTokens = async (): Promise<ApiTokensIndexResponse> => {
  return api.get<ApiTokensIndexResponse>('/user/api-tokens')
}

export const createApiToken = async (payload: {
  name: string
  permissions: string[]
}): Promise<CreateApiTokenResponse> => {
  return api.post<CreateApiTokenResponse>('/user/api-tokens', payload)
}

export const updateApiTokenPermissions = async (
  tokenId: number,
  payload: { permissions: string[] }
): Promise<{ token: ApiTokenItem }> => {
  return api.put<{ token: ApiTokenItem }>(`/user/api-tokens/${String(tokenId)}`, payload)
}

export const revokeApiToken = async (tokenId: number): Promise<{ revoked: boolean }> => {
  return api.delete<{ revoked: boolean }>(`/user/api-tokens/${String(tokenId)}`)
}
