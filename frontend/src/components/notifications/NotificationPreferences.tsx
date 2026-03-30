import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useNotificationPreferences } from '@/hooks/use-notification-preferences'
import { DeviceNotificationsCard } from './DeviceNotificationsCard'
import { TelegramNotificationsCard } from './TelegramNotificationsCard'
import { NotificationPreferencesSkeleton } from './NotificationPreferencesSkeleton'
import { NotificationPreferencesGroups } from './NotificationPreferencesGroups'

export function NotificationPreferences() {
  const { groupedPreferences, loading, error, updating, preferences, updatePreference } =
    useNotificationPreferences()

  if (loading) {
    return <NotificationPreferencesSkeleton />
  }

  if (error && preferences.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DeviceNotificationsCard />
      <TelegramNotificationsCard />

      {error && (
        <Alert variant="destructive" data-testid="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <NotificationPreferencesGroups
        groupedPreferences={groupedPreferences}
        updating={updating}
        onToggle={(args) => {
          void updatePreference(args)
        }}
      />
    </div>
  )
}
