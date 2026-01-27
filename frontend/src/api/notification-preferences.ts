import { api } from '@/api/axios'

export interface NotificationPreference {
  type: string
  label: string
  description: string
  group: string
  group_label: string
  email_enabled: boolean
  in_app_enabled: boolean
}

export interface UpdatePreferenceRequest {
  type: string
  email_enabled: boolean
  in_app_enabled: boolean
}

export interface UpdatePreferencesRequest {
  preferences: UpdatePreferenceRequest[]
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  return await api.get<NotificationPreference[]>('/notification-preferences')
}

export async function updateNotificationPreferences(
  preferences: UpdatePreferenceRequest[]
): Promise<{ message: string }> {
  return await api.put<{ message: string }>('/notification-preferences', {
    preferences,
  })
}
