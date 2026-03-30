import { Bell, BotMessageSquare, Info, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import type { GetNotificationPreferences200Item as NotificationPreference } from '@/api/generated/model'

export function NotificationPreferenceRow(props: {
  preference: NotificationPreference
  disabled: boolean
  onToggle: (args: {
    type: string
    field: 'email_enabled' | 'in_app_enabled' | 'telegram_enabled'
    value: boolean
  }) => void
}) {
  const { preference, disabled, onToggle } = props
  const telegramEnabled = (preference as Record<string, unknown>).telegram_enabled as
    | boolean
    | undefined

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
