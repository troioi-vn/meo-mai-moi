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
  const res = await api.get<{ data: PushSubscriptionSummary[] }>('/push-subscriptions')
  return res.data
}

export async function upsertPushSubscription(payload: PushSubscriptionPayload) {
  const res = await api.post<{ data: { id: number } }>('/push-subscriptions', payload)
  return res.data
}

export async function deletePushSubscription(endpoint: string) {
  await api.delete('/push-subscriptions', { data: { endpoint } })
}
