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

export async function getNotificationPreferences(): Promise<{ data: NotificationPreference[] }> {
  const response = await api.get<{ data: NotificationPreference[] }>('/notification-preferences')
  return response.data
}

export async function updateNotificationPreferences(
  preferences: UpdatePreferenceRequest[]
): Promise<{ data: null; message: string }> {
  const response = await api.put<{ data: null; message: string }>('/notification-preferences', {
    preferences,
  })
  return response.data
}
