import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deletePushSubscriptions as deletePushSubscription,
  postPushSubscriptions as upsertPushSubscription,
} from '@/api/generated/notifications/notifications'
import {
  getServiceWorkerRegistration,
  normaliseSubscriptionJSON,
  urlBase64ToUint8Array,
} from '@/lib/web-push'
import { getBrowserEnvironment } from '@/lib/browser-environment'

export type DevicePushStatus = 'checking' | 'enabled' | 'disabled' | 'error'

type PermissionState = 'unsupported' | NotificationPermission

export function usePushNotifications() {
  const { t } = useTranslation(['settings'])
  const browserEnvironment = useMemo(() => getBrowserEnvironment(), [])
  const isLikelyInAppBrowser = browserEnvironment.isLikelyInAppBrowser
  const isTelegramMiniApp = browserEnvironment.isTelegramMiniApp

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
        error instanceof Error
          ? error.message
          : t('settings:notifications.device.errors.statusCheckFailed')
      )
      setPushStatus('error')
    }
  }, [supportsDeviceNotifications, t])

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
          throw new Error(t('settings:notifications.device.errors.swNotReady'))
        }

        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
          const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
          if (!vapidPublicKey) {
            throw new Error(t('settings:notifications.device.errors.notConfigured'))
          }

          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
            })
          } catch (subscribeError) {
            if (subscribeError instanceof Error) {
              if (subscribeError.name === 'NotAllowedError') {
                throw new Error(t('settings:notifications.device.errors.permissionDenied'))
              } else if (subscribeError.name === 'AbortError') {
                throw new Error(t('settings:notifications.device.errors.aborted'))
              } else if (subscribeError.name === 'NotSupportedError') {
                throw new Error(
                  isLikelyInAppBrowser
                    ? t('settings:notifications.device.errors.inAppBrowser')
                    : isTelegramMiniApp
                      ? t('settings:notifications.device.errors.telegramMiniApp')
                      : t('settings:notifications.device.errors.notSupported')
                )
              }
            }
            throw subscribeError
          }
        }

        const payload = normaliseSubscriptionJSON(subscription)
        if (!payload) {
          throw new Error(t('settings:notifications.device.errors.serializationFailed'))
        }

        if (!payload.keys.p256dh || !payload.keys.auth) {
          throw new Error(t('settings:notifications.device.errors.keysIncomplete'))
        }

        try {
          await upsertPushSubscription({
            endpoint: payload.endpoint,
            keys: payload.keys,
            expiration_time: payload.expirationTime ?? undefined,
            content_encoding: 'aes128gcm',
          })
        } catch (apiError) {
          console.error('[notifications] Failed to save subscription to backend:', apiError)
          throw new Error(t('settings:notifications.device.errors.registrationFailed'))
        }

        setPushStatus('enabled')
        setPushError(null)
      } catch (error) {
        if (!silent) {
          const message =
            error instanceof Error
              ? error.message
              : t('settings:notifications.device.errors.enableFailed')
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
    [supportsDeviceNotifications, refreshPushState, t, isLikelyInAppBrowser, isTelegramMiniApp]
  )

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      setPushStatus('error')
      setPushError(t('settings:notifications.device.errors.notSupported'))
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
        error instanceof Error
          ? error.message
          : t('settings:notifications.device.errors.permissionRequestFailed')
      )
    } finally {
      setRequestingPermission(false)
    }
  }, [subscribeDevice, t])

  const unsubscribeDevice = useCallback(async () => {
    if (!supportsDeviceNotifications) return
    setPushSyncing(true)
    setPushError(null)
    try {
      const registration = await getServiceWorkerRegistration()
      if (!registration) throw new Error(t('settings:notifications.device.errors.swNotReadySimple'))

      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        try {
          await deletePushSubscription({ endpoint: subscription.endpoint })
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
          throw new Error(t('settings:notifications.device.errors.unsubscriptionFailed'))
        }
      }
      setPushStatus('disabled')
      setPushError(null)
    } catch (error) {
      setPushError(
        error instanceof Error
          ? error.message
          : t('settings:notifications.device.errors.disableFailed')
      )
      setPushStatus('error')
    } finally {
      setPushSyncing(false)
      await refreshPushState()
    }
  }, [supportsDeviceNotifications, refreshPushState, t])

  // Auto-subscribe when permission is granted but push is not enabled
  useEffect(() => {
    if (!supportsDeviceNotifications) return
    if (permission !== 'granted') return
    if (pushStatus === 'enabled') return
    void subscribeDevice({ silent: true })
  }, [supportsDeviceNotifications, permission, pushStatus, subscribeDevice])

  return {
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
  }
}
