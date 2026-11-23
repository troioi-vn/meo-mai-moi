import { api } from '@/api/axios'

export interface McpAgentClientItem {
  id: number
  name: string
  client_id: string
  scopes: string[]
  expires_at: string | null
  last_used_at: string | null
  created_at: string | null
}

export interface McpAgentClientsIndexResponse {
  enabled: boolean
  clients: McpAgentClientItem[]
  available_scopes: string[]
}

export interface CreateMcpAgentClientResponse {
  client: McpAgentClientItem
  client_secret: string
}

export const listMcpAgentClients = async (): Promise<McpAgentClientsIndexResponse> => {
  return api.get<McpAgentClientsIndexResponse>('/user/mcp-agent-clients')
}

export const createMcpAgentClient = async (payload: {
  name: string
  scopes: string[]
  expires_in_days: number | null
}): Promise<CreateMcpAgentClientResponse> => {
  return api.post<CreateMcpAgentClientResponse>('/user/mcp-agent-clients', payload)
}

export const revokeMcpAgentClient = async (id: number): Promise<{ revoked: boolean }> => {
  return api.delete<{ revoked: boolean }>(`/user/mcp-agent-clients/${String(id)}`)
}

/** The default preset from the gateway's client guide. */
export const EVERYDAY_CARE_SCOPES = [
  'pets:read',
  'pets:write',
  'health:read',
  'health:write',
  'habits:read',
  'habits:write',
  'microchips:read',
  'microchips:write',
]
