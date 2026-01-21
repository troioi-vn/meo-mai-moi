import { api } from '@/api/axios'
import type { AppNotification } from '@/types/notification'

export async function markAllRead(before?: string) {
  await api.post(`/notifications/mark-all-read`, before ? { before } : undefined)
}

export async function markRead(id: string) {
  await api.patch(`/notifications/${id}/read`)
}

export interface UnifiedNotificationsResponse {
  bell_notifications: AppNotification[]
  unread_bell_count: number
  unread_message_count: number
}

export async function getUnifiedNotifications(
  params: {
    limit?: number
    includeBellNotifications?: boolean
  } = {}
): Promise<UnifiedNotificationsResponse> {
  const { limit = 20, includeBellNotifications = true } = params

  const res = await api.get<UnifiedNotificationsResponse>(`/notifications/unified`, {
    params: {
      limit,
      include_bell_notifications: includeBellNotifications ? 1 : 0,
    },
  })

  return res.data
}
