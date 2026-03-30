import { useCallback, useState, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export function DeviceNotificationsCard() {
  const { t } = useTranslation(['settings'])
  const {
    permission,
    requestingPermission,
    supportsDeviceNotifications,
    pushStatus,
    pushSyncing,
    pushError,
    isLikelyInAppBrowser,
    isTelegramMiniApp,
    requestPermission,
    subscribeDevice,
    unsubscribeDevice,
  } = usePushNotifications()

  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleCopyLink = useCallback(async () => {
    setCopyStatus('idle')
    try {
      if (
        typeof window === 'undefined' ||
        !('clipboard' in navigator) ||
        typeof navigator.clipboard.writeText !== 'function'
      ) {
        throw new Error('Clipboard API unavailable')
      }
      await navigator.clipboard.writeText(window.location.href)
      setCopyStatus('success')
    } catch {
      setCopyStatus('error')
    }
  }, [])

  const deviceStatusMessage = (() => {
    if (permission === 'unsupported' || !supportsDeviceNotifications) {
      return isLikelyInAppBrowser
        ? t('settings:notifications.device.status.inAppUnsupported')
        : isTelegramMiniApp
          ? t('settings:notifications.device.status.telegramMiniAppUnsupported')
          : t('settings:notifications.device.status.unsupported')
    }
    if (permission === 'denied') {
      return t('settings:notifications.device.status.blocked')
    }
    if (pushStatus === 'checking') {
      return t('settings:notifications.device.status.checking')
    }
    if (pushStatus === 'enabled') {
      return t('settings:notifications.device.status.enabled')
    }
    if (pushStatus === 'error') {
      return t('settings:notifications.device.status.error')
    }
    return t('settings:notifications.device.status.disabled')
  })()

  const showInAppBrowserWarning = isLikelyInAppBrowser && pushStatus !== 'enabled'

  let deviceActionButton: ReactNode = null
  if (permission === 'default' && supportsDeviceNotifications) {
    deviceActionButton = (
      <Button
        size="sm"
        variant="outline"
        onClick={() => void requestPermission()}
        disabled={requestingPermission || pushSyncing}
      >
        {requestingPermission
          ? t('settings:notifications.device.actions.requesting')
          : t('settings:notifications.device.actions.enable')}
      </Button>
    )
  } else if (permission === 'granted' && supportsDeviceNotifications) {
    if (pushStatus === 'enabled') {
      deviceActionButton = (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void unsubscribeDevice()}
          disabled={pushSyncing}
        >
          {pushSyncing
            ? t('settings:notifications.device.actions.disabling')
            : t('settings:notifications.device.actions.disable')}
        </Button>
      )
    } else if (pushStatus === 'disabled' || pushStatus === 'error') {
      deviceActionButton = (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void subscribeDevice()}
          disabled={pushSyncing}
        >
          {pushSyncing
            ? t('settings:notifications.device.actions.enabling')
            : t('settings:notifications.device.actions.enable')}
        </Button>
      )
    } else {
      deviceActionButton = (
        <Button size="sm" disabled>
          {t('settings:notifications.device.actions.checking')}
        </Button>
      )
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-foreground">
          {t('settings:notifications.device.title')}
        </h4>
        <p className="text-sm text-muted-foreground">
          {t('settings:notifications.device.description')}
        </p>
      </div>
      {showInAppBrowserWarning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>{t('settings:notifications.device.inAppBrowser.warning')}</p>
            <p>{t('settings:notifications.device.inAppBrowser.instructions')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void handleCopyLink()}>
                {t('settings:notifications.device.inAppBrowser.actions.copyLink')}
              </Button>
              {copyStatus === 'success' && (
                <span className="text-xs text-muted-foreground">
                  {t('settings:notifications.device.inAppBrowser.copyFeedback.success')}
                </span>
              )}
              {copyStatus === 'error' && (
                <span className="text-xs text-muted-foreground">
                  {t('settings:notifications.device.inAppBrowser.copyFeedback.error')}
                </span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      {isTelegramMiniApp && pushStatus !== 'enabled' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('settings:notifications.device.telegramMiniAppHint')}
          </AlertDescription>
        </Alert>
      )}
      {permission === 'unsupported' || !supportsDeviceNotifications ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{deviceStatusMessage}</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">{deviceStatusMessage}</span>
            {deviceActionButton}
          </div>
          {pushError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{pushError}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}
