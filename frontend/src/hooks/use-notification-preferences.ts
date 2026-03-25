import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from '@/lib/i18n-toast'
import { useTranslation } from 'react-i18next'
import {
  getNotificationPreferences,
  putNotificationPreferences,
} from '@/api/generated/notification-preferences/notification-preferences'
import type {
  GetNotificationPreferences200Item as NotificationPreference,
  PutNotificationPreferencesBodyPreferencesItem as UpdatePreferenceRequest,
} from '@/api/generated/model'
import type { GroupedPreferences } from '@/components/notifications/NotificationPreferencesGroups'

interface NotificationPreferencesState {
  preferences: NotificationPreference[]
  loading: boolean
  error: string | null
  updating: boolean
}

export function useNotificationPreferences() {
  const { t } = useTranslation('settings')
  const [state, setState] = useState<NotificationPreferencesState>({
    preferences: [],
    loading: true,
    error: null,
    updating: false,
  })

  const loadPreferences = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const response = await getNotificationPreferences()
      setState((prev) => ({
        ...prev,
        preferences: response,
        loading: false,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : t('notifications.error'),
      }))
    }
  }, [t])

  useEffect(() => {
    void loadPreferences()
  }, [loadPreferences])

  const groupedPreferences = useMemo<GroupedPreferences>(() => {
    const groups: GroupedPreferences = {}
    for (const pref of state.preferences) {
      const group = (groups[pref.group] ??= { label: pref.group_label, preferences: [] })
      group.preferences.push(pref)
    }
    return groups
  }, [state.preferences])

  const updatePreference = useCallback(
    async (args: {
      type: string
      field: 'email_enabled' | 'in_app_enabled' | 'telegram_enabled'
      value: boolean
    }) => {
      const { type, field, value } = args
      const previousPreferences = state.preferences

      try {
        setState((prev) => ({ ...prev, updating: true, error: null }))

        // Optimistically update the UI
        setState((prev) => ({
          ...prev,
          preferences: prev.preferences.map((pref) =>
            pref.type === type ? { ...pref, [field]: value } : pref
          ),
        }))

        const currentPreference = previousPreferences.find((pref) => pref.type === type)
        if (!currentPreference) {
          throw new Error('Preference not found')
        }

        const currentTelegram = Boolean(
          (currentPreference as Record<string, unknown>).telegram_enabled
        )
        const updateRequest: UpdatePreferenceRequest & { telegram_enabled?: boolean } = {
          type,
          email_enabled: field === 'email_enabled' ? value : currentPreference.email_enabled,
          in_app_enabled: field === 'in_app_enabled' ? value : currentPreference.in_app_enabled,
          telegram_enabled: field === 'telegram_enabled' ? value : currentTelegram,
        }

        await putNotificationPreferences({ preferences: [updateRequest] })

        setState((prev) => ({ ...prev, updating: false }))
        toast.success('settings:notifications.saved')
      } catch (error) {
        setState((prev) => ({
          ...prev,
          updating: false,
          error: error instanceof Error ? error.message : t('notifications.error'),
          preferences: previousPreferences,
        }))
      }
    },
    [state.preferences, t]
  )

  return {
    preferences: state.preferences,
    groupedPreferences,
    loading: state.loading,
    error: state.error,
    updating: state.updating,
    updatePreference,
  }
}
