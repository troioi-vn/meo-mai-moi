import type { AppNotification } from '@/types/notification'
import {
  postNotificationsMarkAllRead as generatedMarkAllRead,
  patchNotificationsIdRead as generatedMarkRead,
  getNotificationsUnified as generatedGetUnifiedNotifications,
  postNotificationsNotificationActionsActionKey as generatedExecuteAction,
} from './generated/notifications/notifications'

export async function markAllRead() {
  await generatedMarkAllRead()
}

export async function markRead(id: string) {
  await generatedMarkRead(id)
}

export interface ExecuteNotificationActionData {
  notification: any
  unread_bell_count: number
}

export interface ExecuteNotificationActionResponse {
  data: ExecuteNotificationActionData
  message?: string
}

export async function executeNotificationAction(
  notificationId: string,
  actionKey: string
): Promise<ExecuteNotificationActionResponse> {
  const res = await generatedExecuteAction(notificationId, actionKey)

  return {
    data: {
      notification: res.notification,
      unread_bell_count: res.unread_bell_count,
    },
    message: res.message,
  }
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

  const response = await generatedGetUnifiedNotifications({
    limit,
    include_bell_notifications: includeBellNotifications ? 1 : 0,
  })

  return response as unknown as UnifiedNotificationsResponse
}
