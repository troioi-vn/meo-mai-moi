import { useState, useEffect, useMemo } from 'react'
import { toast } from '@/lib/i18n-toast'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
  getNotificationPreferences,
  putNotificationPreferences,
} from '@/api/generated/notification-preferences/notification-preferences'
import type {
  GetNotificationPreferences200Item as NotificationPreference,
  PutNotificationPreferencesBodyPreferencesItem as UpdatePreferenceRequest,
} from '@/api/generated/model'
import { DeviceNotificationsCard } from './DeviceNotificationsCard'
import { NotificationPreferencesSkeleton } from './NotificationPreferencesSkeleton'
import { NotificationPreferencesGroups } from './NotificationPreferencesGroups'

interface NotificationPreferencesState {
  preferences: NotificationPreference[]
  loading: boolean
  error: string | null
  updating: boolean
}

export function NotificationPreferences() {
  const { t } = useTranslation('settings')
  const [state, setState] = useState<NotificationPreferencesState>({
    preferences: [],
    loading: true,
    error: null,
    updating: false,
  })

  // Load preferences on component mount
  useEffect(() => {
    void loadPreferences()
  }, [])

  const loadPreferences = async () => {
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
  }

  // Group preferences by group
  const groupedPreferences = useMemo(() => {
    const groups: Record<string, { label: string; preferences: NotificationPreference[] }> = {}
    for (const pref of state.preferences) {
      const group = (groups[pref.group] ??= { label: pref.group_label, preferences: [] })
      group.preferences.push(pref)
    }
    return groups
  }, [state.preferences])

  const updatePreference = async (args: {
    type: string
    field: 'email_enabled' | 'in_app_enabled'
    value: boolean
  }) => {
    const { type, field, value } = args
    // Snapshot previous preferences so we can revert on error
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

      // Find the current preference from the snapshot to get both values
      const currentPreference = previousPreferences.find((pref) => pref.type === type)
      if (!currentPreference) {
        throw new Error('Preference not found')
      }

      // Create the update request with both current values
      const updateRequest: UpdatePreferenceRequest = {
        type,
        email_enabled: field === 'email_enabled' ? value : currentPreference.email_enabled,
        in_app_enabled: field === 'in_app_enabled' ? value : currentPreference.in_app_enabled,
      }

      await putNotificationPreferences({ preferences: [updateRequest] })

      setState((prev) => ({
        ...prev,
        updating: false,
      }))

      toast.success('settings:notifications.saved')
    } catch (error) {
      // Revert the optimistic update on error and preserve the error message
      setState((prev) => ({
        ...prev,
        updating: false,
        error: error instanceof Error ? error.message : t('notifications.error'),
        preferences: previousPreferences,
      }))
      // Do not reload preferences here because that would clear the error immediately
    }
  }

  if (state.loading) {
    return <NotificationPreferencesSkeleton />
  }

  if (state.error && state.preferences.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">{t('notifications.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('notifications.controlDescription')}</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">{t('notifications.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('notifications.controlDescription')}</p>
      </div>

      <DeviceNotificationsCard />

      {state.error && (
        <Alert variant="destructive" data-testid="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <NotificationPreferencesGroups
        groupedPreferences={groupedPreferences}
        updating={state.updating}
        onToggle={(args) => {
          void updatePreference(args)
        }}
      />
    </div>
  )
}
