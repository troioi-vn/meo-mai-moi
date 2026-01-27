import {
  getPushSubscriptions as generatedList,
  postPushSubscriptions as generatedUpsert,
  deletePushSubscriptions as generatedDelete,
} from './generated/notifications/notifications'
import type {
  PushSubscriptionSummary,
  PushSubscriptionPayload,
  PostPushSubscriptions201,
} from './generated/model'

export type { PushSubscriptionSummary, PushSubscriptionPayload }

export async function listPushSubscriptions(): Promise<PushSubscriptionSummary[]> {
  return await generatedList()
}

export async function upsertPushSubscription(
  payload: PushSubscriptionPayload
): Promise<PostPushSubscriptions201> {
  return await generatedUpsert(payload)
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await generatedDelete({ endpoint })
}
