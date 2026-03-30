import type { ElementType } from 'react'
import {
  Bell,
  BotMessageSquare,
  HeartHandshake,
  HouseHeart,
  Mail,
  MessageSquare,
  Shield,
} from 'lucide-react'
import type { GetNotificationPreferences200Item as NotificationPreference } from '@/api/generated/model'
import { NotificationPreferenceRow } from './NotificationPreferenceRow'

const groupIcons: Record<string, ElementType> = {
  placement_owner: HeartHandshake,
  placement_helper: HouseHeart,
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
    field: 'email_enabled' | 'in_app_enabled' | 'telegram_enabled'
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

            <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_3rem_3rem_3rem] items-center px-4 py-2 border-b bg-muted/30 text-muted-foreground text-xs">
              <span className="font-medium">Type</span>
              <span className="flex justify-center" aria-label="Email notifications column">
                <Mail className="h-4 w-4" />
              </span>
              <span className="flex justify-center" aria-label="In-app notifications column">
                <Bell className="h-4 w-4" />
              </span>
              <span className="flex justify-center" aria-label="Telegram notifications column">
                <BotMessageSquare className="h-4 w-4" />
              </span>
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
