import type { ElementType } from 'react'
import {
  Bell,
  BotMessageSquare,
  HeartHandshake,
  HouseHeart,
  Info,
  Mail,
  MessageSquare,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import type { GetNotificationPreferences200Item as NotificationPreference } from '@/api/generated/model'

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

function NotificationPreferenceRow(props: {
  preference: NotificationPreference
  disabled: boolean
  onToggle: (args: {
    type: string
    field: 'email_enabled' | 'in_app_enabled' | 'telegram_enabled'
    value: boolean
  }) => void
}) {
  const { preference, disabled, onToggle } = props
  const telegramEnabled =
    (preference as Record<string, unknown>).telegram_enabled as boolean | undefined

  return (
    <div className="px-4 py-3 flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_3rem_3rem_3rem] sm:items-center sm:gap-2">
      <div className="min-w-0 flex items-center gap-1.5 sm:col-start-1">
        <p className="font-medium text-sm sm:truncate">{preference.label}</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label={`More information about ${preference.label}`}
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <p className="text-sm text-muted-foreground">{preference.description}</p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:contents">
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground sm:hidden" />
            <Switch
              checked={preference.email_enabled}
              onCheckedChange={(value) => {
                onToggle({ type: preference.type, field: 'email_enabled', value })
              }}
              disabled={disabled}
              aria-label={`Toggle email notifications for ${preference.label}`}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-muted-foreground sm:hidden" />
            <Switch
              checked={preference.in_app_enabled}
              onCheckedChange={(value) => {
                onToggle({ type: preference.type, field: 'in_app_enabled', value })
              }}
              disabled={disabled}
              aria-label={`Toggle in-app notifications for ${preference.label}`}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-1.5">
            <BotMessageSquare className="h-3.5 w-3.5 text-muted-foreground sm:hidden" />
            <Switch
              checked={telegramEnabled ?? false}
              onCheckedChange={(value) => {
                onToggle({ type: preference.type, field: 'telegram_enabled', value })
              }}
              disabled={disabled}
              aria-label={`Toggle Telegram notifications for ${preference.label}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
