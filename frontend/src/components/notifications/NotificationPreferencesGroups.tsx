import type { ElementType } from 'react'
import { Bell, Heart, Mail, MessageSquare, Shield } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { NotificationPreference } from '@/api/notification-preferences'

const groupIcons: Record<string, ElementType> = {
  placement_owner: Heart,
  placement_helper: Heart,
  pet_reminders: Bell,
  account: Shield,
  messaging: MessageSquare,
}

export type GroupedPreferences = Record<
  string,
  {
    label: string
    preferences: NotificationPreference[]
  }
>

export function NotificationPreferencesGroups(props: {
  groupedPreferences: GroupedPreferences
  updating: boolean
  onToggle: (args: {
    type: string
    field: 'email_enabled' | 'in_app_enabled'
    value: boolean
  }) => void
}) {
  const { groupedPreferences, updating, onToggle } = props

  if (Object.keys(groupedPreferences).length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No notification types available.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedPreferences).map(([groupKey, group]) => {
        const GroupIcon = groupIcons[groupKey] ?? Bell
        return (
          <div key={groupKey} className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
              <GroupIcon className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">{group.label}</h4>
            </div>

            <div className="divide-y">
              {group.preferences.map((preference) => (
                <NotificationPreferenceRow
                  key={preference.type}
                  preference={preference}
                  disabled={updating}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NotificationPreferenceRow(props: {
  preference: NotificationPreference
  disabled: boolean
  onToggle: (args: {
    type: string
    field: 'email_enabled' | 'in_app_enabled'
    value: boolean
  }) => void
}) {
  const { preference, disabled, onToggle } = props

  return (
    <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{preference.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{preference.description}</p>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        <label className="flex items-center gap-2 cursor-pointer">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground hidden sm:inline">Email</span>
          <Switch
            checked={preference.email_enabled}
            onCheckedChange={(value) => {
              onToggle({ type: preference.type, field: 'email_enabled', value })
            }}
            disabled={disabled}
            aria-label={`Toggle email notifications for ${preference.label}`}
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground hidden sm:inline">In-App</span>
          <Switch
            checked={preference.in_app_enabled}
            onCheckedChange={(value) => {
              onToggle({ type: preference.type, field: 'in_app_enabled', value })
            }}
            disabled={disabled}
            aria-label={`Toggle in-app notifications for ${preference.label}`}
          />
        </label>
      </div>
    </div>
  )
}
