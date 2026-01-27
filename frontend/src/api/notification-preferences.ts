import {
  getNotificationPreferences as generatedGetNotificationPreferences,
  putNotificationPreferences as generatedPutNotificationPreferences,
} from './generated/notification-preferences/notification-preferences'

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
  const data = await generatedGetNotificationPreferences()
  return data as unknown as NotificationPreference[]
}

export async function updateNotificationPreferences(
  preferences: UpdatePreferenceRequest[]
): Promise<{ message: string }> {
  const data = await generatedPutNotificationPreferences({ preferences })
  return data as unknown as { message: string }
}
