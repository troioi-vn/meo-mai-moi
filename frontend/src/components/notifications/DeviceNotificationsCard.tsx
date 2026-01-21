import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { deletePushSubscription, upsertPushSubscription } from '@/api/push-subscriptions'
import {
  getServiceWorkerRegistration,
  normaliseSubscriptionJSON,
  urlBase64ToUint8Array,
} from '@/lib/web-push'

type DevicePushStatus = 'checking' | 'enabled' | 'disabled' | 'error'

type PermissionState = 'unsupported' | NotificationPermission

export function DeviceNotificationsCard() {
  const [permission, setPermission] = useState<PermissionState>('default')
  const [requestingPermission, setRequestingPermission] = useState(false)
  const [supportsDeviceNotifications, setSupportsDeviceNotifications] = useState(false)
  const [pushStatus, setPushStatus] = useState<DevicePushStatus>('checking')
  const [pushSyncing, setPushSyncing] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const supports =
      'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setSupportsDeviceNotifications(supports)
    if (!supports) {
      setPermission('unsupported')
      setPushStatus('disabled')
      return
    }
    setPermission(Notification.permission)
  }, [])

  const refreshPushState = useCallback(async () => {
    if (!supportsDeviceNotifications) {
      return
    }
    try {
      const registration = await getServiceWorkerRegistration()
      if (!registration) {
        setPushStatus('disabled')
        return
      }
      const subscription = await registration.pushManager.getSubscription()
      setPushStatus(subscription ? 'enabled' : 'disabled')
    } catch (error) {
      setPushError(
        error instanceof Error ? error.message : 'Unable to determine device notification status.'
      )
      setPushStatus('error')
    }
  }, [supportsDeviceNotifications])

  useEffect(() => {
    if (!supportsDeviceNotifications) {
      return
    }
    if (permission === 'denied') {
      setPushStatus('disabled')
      return
    }
    setPushStatus('checking')
    setPushError(null)
    void refreshPushState()
  }, [supportsDeviceNotifications, permission, refreshPushState])

  useEffect(() => {
    if (!supportsDeviceNotifications || typeof window === 'undefined') {
      return
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown } | null | undefined
      if (
        data &&
        typeof data === 'object' &&
        'type' in data &&
        (data as { type?: unknown }).type === 'pushsubscriptionchange'
      ) {
        void refreshPushState()
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [supportsDeviceNotifications, refreshPushState])

  const subscribeDevice = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!supportsDeviceNotifications) return
      const silent = options?.silent ?? false
      if (!silent) {
        setPushSyncing(true)
        setPushError(null)
        setPushStatus('checking')
      }
      try {
        const registration = await getServiceWorkerRegistration()
        if (!registration) {
          throw new Error(
            'Service worker is not ready yet. Please reload the page or install the app before enabling device notifications.'
          )
        }

        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
          const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
          if (!vapidPublicKey) {
            throw new Error('Push notifications are not configured for this environment.')
          }

          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
            })
          } catch (subscribeError) {
            if (subscribeError instanceof Error) {
              if (subscribeError.name === 'NotAllowedError') {
                throw new Error('Permission to show notifications was denied.')
              } else if (subscribeError.name === 'AbortError') {
                throw new Error('Subscription was aborted. Please try again.')
              }
            }
            throw subscribeError
          }
        }

        const payload = normaliseSubscriptionJSON(subscription)
        if (!payload) {
          throw new Error('Failed to serialise the push subscription.')
        }

        if (!payload.keys.p256dh || !payload.keys.auth) {
          throw new Error('Push subscription keys are incomplete.')
        }

        try {
          await upsertPushSubscription({
            endpoint: payload.endpoint,
            keys: payload.keys,
            expirationTime: payload.expirationTime ?? undefined,
            contentEncoding: 'aes128gcm',
          })
        } catch (apiError) {
          console.error('[notifications] Failed to save subscription to backend:', apiError)
          throw new Error('Failed to register push subscription with the server.')
        }

        setPushStatus('enabled')
        setPushError(null)
      } catch (error) {
        if (!silent) {
          const message =
            error instanceof Error ? error.message : 'Failed to enable device notifications.'
          setPushError(message)
          setPushStatus('error')
        } else {
          console.warn('[notifications] Failed to silently subscribe for push notifications', error)
        }
      } finally {
        if (!silent) {
          setPushSyncing(false)
        }
        await refreshPushState()
      }
    },
    [supportsDeviceNotifications, refreshPushState]
  )

  const handleRequestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      setPushStatus('error')
      setPushError('This browser does not support notifications.')
      return
    }
    try {
      setRequestingPermission(true)
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        await subscribeDevice()
      }
    } catch (error) {
      setPermission('denied')
      setPushError(
        error instanceof Error ? error.message : 'Notification permission request failed.'
      )
    } finally {
      setRequestingPermission(false)
    }
  }, [subscribeDevice])

  const disableDeviceNotifications = useCallback(async () => {
    if (!supportsDeviceNotifications) return
    setPushSyncing(true)
    setPushError(null)
    try {
      const registration = await getServiceWorkerRegistration()
      if (!registration) throw new Error('Service worker is not ready yet.')

      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        try {
          await deletePushSubscription(subscription.endpoint)
        } catch (apiError) {
          console.warn('[notifications] Failed to delete subscription from backend:', apiError)
        }

        try {
          const unsubscribed = await subscription.unsubscribe()
          if (!unsubscribed) {
            console.warn('[notifications] PushManager.unsubscribe() returned false')
          }
        } catch (unsubError) {
          console.error('[notifications] Failed to unsubscribe:', unsubError)
          throw new Error('Failed to remove push subscription from browser.')
        }
      }
      setPushStatus('disabled')
      setPushError(null)
    } catch (error) {
      setPushError(
        error instanceof Error ? error.message : 'Failed to disable device notifications.'
      )
      setPushStatus('error')
    } finally {
      setPushSyncing(false)
      await refreshPushState()
    }
  }, [supportsDeviceNotifications, refreshPushState])

  useEffect(() => {
    if (!supportsDeviceNotifications) return
    if (permission !== 'granted') return
    if (pushStatus === 'enabled') return
    void subscribeDevice({ silent: true })
  }, [supportsDeviceNotifications, permission, pushStatus, subscribeDevice])

  const deviceStatusMessage = (() => {
    if (permission === 'unsupported' || !supportsDeviceNotifications) {
      return 'This browser does not support push notifications. Try using a modern browser like Chrome, Edge, or Firefox.'
    }
    if (permission === 'denied') {
      return 'Notifications are blocked. Update your browser settings to allow them.'
    }
    if (pushStatus === 'checking') {
      return 'Checking device notification status...'
    }
    if (pushStatus === 'enabled') {
      return 'Device notifications are enabled.'
    }
    if (pushStatus === 'error') {
      return 'Unable to verify device notification status.'
    }
    return 'Device notifications are disabled.'
  })()

  let deviceActionButton: ReactNode = null
  if (permission === 'default' && supportsDeviceNotifications) {
    deviceActionButton = (
      <Button
        size="sm"
        onClick={() => void handleRequestPermission()}
        disabled={requestingPermission || pushSyncing}
      >
        {requestingPermission ? 'Requesting…' : 'Enable device notifications'}
      </Button>
    )
  } else if (permission === 'granted' && supportsDeviceNotifications) {
    if (pushStatus === 'enabled') {
      deviceActionButton = (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void disableDeviceNotifications()}
          disabled={pushSyncing}
        >
          {pushSyncing ? 'Disabling…' : 'Disable on this device'}
        </Button>
      )
    } else if (pushStatus === 'disabled' || pushStatus === 'error') {
      deviceActionButton = (
        <Button size="sm" onClick={() => void subscribeDevice()} disabled={pushSyncing}>
          {pushSyncing ? 'Enabling…' : 'Enable on this device'}
        </Button>
      )
    } else {
      deviceActionButton = (
        <Button size="sm" disabled>
          Checking…
        </Button>
      )
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-foreground">Device notifications</h4>
        <p className="text-sm text-muted-foreground">
          Enable native OS alerts for in-app activity on this device.
        </p>
      </div>
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
