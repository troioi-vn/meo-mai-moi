export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export type NotificationActionVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'link'

export interface NotificationActionConfirm {
  title: string
  description?: string | null
  confirm_label?: string | null
}

export interface NotificationAction {
  key: string
  label: string
  variant?: NotificationActionVariant
  disabled?: boolean
  disabled_reason?: string | null
  confirm?: NotificationActionConfirm
}

export interface AppNotification {
  id: string
  level: NotificationLevel
  title: string
  body?: string | null
  url?: string | null
  actions?: NotificationAction[]
  created_at: string // ISO string
  read_at: string | null // ISO or null
}
