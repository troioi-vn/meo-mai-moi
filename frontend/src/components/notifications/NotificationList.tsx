import { Link } from 'react-router-dom'
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from '@/lib/i18n-toast'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useNotifications } from '@/contexts/NotificationProvider'
import { postNotificationsNotificationActionsActionKey as executeNotificationAction } from '@/api/generated/notifications/notifications'
import type { PostNotificationsNotificationActionsActionKey200 as ExecuteNotificationActionData } from '@/api/generated/model'
import type { NotificationAction } from '@/types/notification'

function LevelIcon({ level }: { level: 'info' | 'success' | 'warning' | 'error' }) {
  const base = 'size-4'
  switch (level) {
    case 'success':
      return (
        <>
          <CheckCircle2 className={`${base} text-emerald-500`} aria-hidden="true" />
          <span className="sr-only">Success:</span>
        </>
      )
    case 'warning':
      return (
        <>
          <AlertTriangle className={`${base} text-amber-500`} aria-hidden="true" />
          <span className="sr-only">Warning:</span>
        </>
      )
    case 'error':
      return (
        <>
          <XCircle className={`${base} text-red-500`} aria-hidden="true" />
          <span className="sr-only">Error:</span>
        </>
      )
    default:
      return (
        <>
          <Info className={`${base} text-blue-500`} aria-hidden="true" />
          <span className="sr-only">Info:</span>
        </>
      )
  }
}

function NotificationActionButton({
  notificationId,
  action,
  onDone,
}: {
  notificationId: string
  action: NotificationAction
  onDone: (result: ExecuteNotificationActionData) => void
}) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const disabled = Boolean(action.disabled)
  const confirm = action.confirm ?? {
    title: t('actions.confirm'),
    description: null,
    confirm_label: action.label,
  }

  const title = confirm.title || t('actions.confirm')
  const description = confirm.description ?? null
  const confirmLabel = confirm.confirm_label ?? action.label

  if (disabled) {
    return (
      <Button
        size="sm"
        variant={action.variant ?? 'destructive'}
        disabled
        title={action.disabled_reason ?? undefined}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {action.label}
      </Button>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant={action.variant ?? 'destructive'}
          disabled={submitting}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {submitting ? t('status.loading') : action.label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t('actions.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault()
              setSubmitting(true)
              executeNotificationAction(notificationId, action.key)
                .then((res) => {
                  if (res.message) toast.raw.success(res.message)
                  onDone(res)
                })
                .catch((err: unknown) => {
                  console.error('Failed to execute notification action:', err)
                  toast.error('common:messages.error')
                })
                .finally(() => {
                  setSubmitting(false)
                  setOpen(false)
                })
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState<number>(0)
  useEffect(() => {
    const initTimeout = setTimeout(() => {
      setNow(Date.now())
    }, 0)
    const id = setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => {
      clearTimeout(initTimeout)
      clearInterval(id)
    }
  }, [intervalMs])
  return now
}

export function NotificationList() {
  const { t } = useTranslation('common')
  const { bellNotifications, loading, markBellRead, applyBellUpdate } = useNotifications()

  const now = useNow()

  const timeAgo = (iso: string) => {
    const created = new Date(iso).getTime()
    const diff = now === 0 ? 0 : now - created
    const s = Math.floor(diff / 1000)
    if (s < 60) return t('time.secondsAgoShort', { count: s })
    const m = Math.floor(s / 60)
    if (m < 60) return t('time.minutesAgoShort', { count: m })
    const h = Math.floor(m / 60)
    if (h < 24) return t('time.hoursAgoShort', { count: h })
    const d = Math.floor(h / 24)
    return t('time.daysAgoShort', { count: d })
  }

  if (loading && bellNotifications.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        {t('messages.loading')}
      </div>
    )
  }

  if (bellNotifications.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        {t('messages.noData')}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card divide-y">
      {bellNotifications.map((n) => {
        const baseClass = `flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/60 ${
          n.read_at ? '' : 'bg-accent/40'
        }`
        const actions = (n.actions ?? []).filter(Boolean)

        const textBlock = (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">{n.title}</p>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {timeAgo(n.created_at)}
            </span>
          </div>
        )

        const body = n.body ? <p className="text-xs text-muted-foreground mt-1">{n.body}</p> : null

        const clickable = (() => {
          if (!n.url) {
            return (
              <button
                type="button"
                className="w-full text-left"
                onClick={() => void markBellRead(n.id)}
              >
                {textBlock}
                {body}
              </button>
            )
          }

          const isExternal = n.url.startsWith('http') || n.url.startsWith('/admin/')
          if (isExternal) {
            return (
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                onClick={() => void markBellRead(n.id)}
              >
                {textBlock}
                {body}
              </a>
            )
          }

          return (
            <Link to={n.url} className="block" onClick={() => void markBellRead(n.id)}>
              {textBlock}
              {body}
            </Link>
          )
        })()

        return (
          <div key={n.id} className={baseClass}>
            <LevelIcon level={n.level} />
            <div className="flex-1 min-w-0">
              {clickable}
              {actions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <NotificationActionButton
                      key={`${n.id}:${action.key}`}
                      notificationId={n.id}
                      action={action}
                      onDone={(result) => {
                        applyBellUpdate({
                          notification: result.notification,
                          unreadBellCount: result.unread_bell_count,
                        })
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
