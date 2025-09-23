import { api } from '@/api/axios'
import type { AppNotification } from '@/types/notification'

export type NotificationStatus = 'unread' | 'all'

export async function getNotifications(
  params: { status?: NotificationStatus; page?: number } = {}
) {
  const { status = 'all', page = 1 } = params
  const res = await api.get<{ data: AppNotification[]; meta?: { next_page_url?: string } }>(
    `/notifications`,
    {
      params: { status, page },
    }
  )
  return res.data
}

export async function markAllRead(before?: string) {
  await api.post(`/notifications/mark-all-read`, before ? { before } : undefined)
}

export async function markRead(id: string) {
  await api.patch(`/notifications/${id}/read`)
}
