export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface AppNotification {
  id: string
  level: NotificationLevel
  title: string
  body?: string | null
  url?: string | null
  created_at: string // ISO string
  read_at: string | null // ISO or null
}
