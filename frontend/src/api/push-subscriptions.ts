import { api } from '@/api/axios'

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: PushSubscriptionKeys
  expirationTime?: number | null
  contentEncoding?: string
}

export interface PushSubscriptionSummary {
  id: number
  endpoint: string
  content_encoding: string | null
  expires_at: string | null
  last_seen_at: string | null
}

export async function listPushSubscriptions() {
  return await api.get<PushSubscriptionSummary[]>('/push-subscriptions')
}

export async function upsertPushSubscription(payload: PushSubscriptionPayload) {
  return await api.post<{ id: number }>('/push-subscriptions', payload)
}

export async function deletePushSubscription(endpoint: string) {
  await api.delete('/push-subscriptions', { data: { endpoint } })
}
