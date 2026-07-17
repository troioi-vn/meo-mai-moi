import { api } from '@/api/axios'

export interface McpSession {
  client_name: string
  scopes: string[]
  expires_at: number
}

export const getMcpSession = (requestRef: string): Promise<McpSession> =>
  api.get<McpSession>('/mcp-auth/session', { params: { request_ref: requestRef } })

export const confirmMcpConnect = (requestRef: string): Promise<{ redirect_url: string }> =>
  api.post<{ redirect_url: string }>('/mcp-auth/confirm', { request_ref: requestRef })

export const denyMcpConnect = (requestRef: string): Promise<{ redirect_url: string }> =>
  api.post<{ redirect_url: string }>('/mcp-auth/deny', { request_ref: requestRef })
