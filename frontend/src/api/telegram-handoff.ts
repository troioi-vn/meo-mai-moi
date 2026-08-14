import { api } from '@/api/axios'

export interface SessionHandoff {
  url: string
  expires_in: number
}

/**
 * Mints a single-use link that signs the current user in somewhere else.
 *
 * Session cookies do not cross browsers, so a session living in an in-app webview cannot be
 * carried into the system browser or a freshly installed PWA by sharing the current URL —
 * only by a fresh token.
 */
export const createSessionHandoff = (redirectPath?: string): Promise<SessionHandoff> =>
  api.post<SessionHandoff>('/telegram/handoff', { redirect_path: redirectPath ?? null })
