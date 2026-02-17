import { useState, useEffect, useCallback } from 'react'
import { BotMessageSquare, Loader2, Unlink } from 'lucide-react'
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
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/lib/i18n-toast'

type TelegramStatus = 'loading' | 'connected' | 'disconnected' | 'error'

interface TelegramStatusResponse {
  is_connected: boolean
}

interface TelegramLinkResponse {
  link_url: string
}

interface TelegramWebAppSdk {
  initData: string
  openTelegramLink?: (url: string) => void
}

export function TelegramNotificationsCard() {
  const { t } = useTranslation('settings')
  const { user } = useAuth()
  const isAdmin = Boolean(user?.can_access_admin)
  const [status, setStatus] = useState<TelegramStatus>('loading')
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const data = await api.get<TelegramStatusResponse>('/telegram/status')
      setStatus(data.is_connected ? 'connected' : 'disconnected')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void checkStatus()
  }, [checkStatus])

  const handleConnect = () => {
    void (async () => {
      try {
        setBusy(true)

        const telegramWebApp = window.Telegram?.WebApp as TelegramWebAppSdk | undefined
        const miniAppInitData = telegramWebApp?.initData.trim() ?? ''

        if (miniAppInitData.length > 0) {
          await api.post('/telegram/link-miniapp', {
            init_data: miniAppInitData,
          })
          setStatus('connected')
          setBusy(false)
          return
        }

        const data = await api.post<TelegramLinkResponse>('/telegram/link-token')

        const openTelegramLink = telegramWebApp?.openTelegramLink
        if (typeof openTelegramLink === 'function') {
          openTelegramLink(data.link_url)
        } else {
          window.open(data.link_url, '_blank', 'noopener')
        }

        // Poll for status change after user potentially connects
        const pollInterval = setInterval(() => {
          void (async () => {
            try {
              const statusData = await api.get<TelegramStatusResponse>('/telegram/status')
              if (statusData.is_connected) {
                setStatus('connected')
                clearInterval(pollInterval)
                setBusy(false)
              }
            } catch {
              // ignore polling errors
            }
          })()
        }, 3000)
        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval)
          setBusy(false)
        }, 300_000)
      } catch {
        setBusy(false)
      }
    })()
  }

  const handleDisconnect = () => {
    void (async () => {
      try {
        setBusy(true)
        await api.delete('/telegram/disconnect')
        setStatus('disconnected')
        setDisconnectDialogOpen(false)
      } catch {
        // keep current state
      } finally {
        setBusy(false)
      }
    })()
  }

  const handleSendTestNotification = () => {
    void (async () => {
      try {
        setTesting(true)
        await api.post('/telegram/test-notification')
        toast.success('settings:notifications.telegram.test.success')
      } catch {
        toast.error('settings:notifications.telegram.test.error')
      } finally {
        setTesting(false)
      }
    })()
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BotMessageSquare className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">
            {t('notifications.telegram.title')}
          </h4>
        </div>
        <p className="text-sm text-muted-foreground">{t('notifications.telegram.description')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {status === 'loading' && (
          <Button size="sm" variant="outline" disabled>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            {t('notifications.telegram.status.checking')}
          </Button>
        )}

        {status === 'disconnected' && (
          <Button size="sm" variant="outline" onClick={handleConnect} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {busy
              ? t('notifications.telegram.status.connecting')
              : t('notifications.telegram.actions.connect')}
          </Button>
        )}

        {status === 'connected' && (
          <>
            <span className="text-sm text-green-600 dark:text-green-400">
              {t('notifications.telegram.status.connected')}
            </span>
            <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" disabled={busy} className="text-destructive">
                  {busy ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unlink className="mr-2 h-3.5 w-3.5" />
                  )}
                  {t('notifications.telegram.actions.disconnect')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('notifications.telegram.disconnectConfirm.title')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('notifications.telegram.disconnectConfirm.description')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect} disabled={busy}>
                    {t('notifications.telegram.disconnectConfirm.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendTestNotification}
                disabled={testing || busy}
              >
                {testing && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {t('notifications.telegram.actions.test')}
              </Button>
            )}
          </>
        )}

        {status === 'disconnected' && isAdmin && (
          <Button size="sm" variant="outline" disabled>
            {t('notifications.telegram.actions.test')}
          </Button>
        )}

        {status === 'error' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void checkStatus()
            }}
          >
            {t('notifications.telegram.actions.connect')}
          </Button>
        )}
      </div>
    </div>
  )
}
