import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreference,
  type UpdatePreferenceRequest,
} from '@/api/notification-preferences'
import { deletePushSubscription, upsertPushSubscription } from '@/api/push-subscriptions'
import {
  getServiceWorkerRegistration,
  normaliseSubscriptionJSON,
  urlBase64ToUint8Array,
} from '@/lib/web-push'

interface NotificationPreferencesState {
  preferences: NotificationPreference[]
  loading: boolean
  error: string | null
  updating: boolean
}

type DevicePushStatus = 'checking' | 'enabled' | 'disabled' | 'error'

export function NotificationPreferences() {
  const [state, setState] = useState<NotificationPreferencesState>({
    preferences: [],
    loading: true,
    error: null,
    updating: false,
  })
  const [permission, setPermission] = useState<'unsupported' | NotificationPermission>('default')
  const [requestingPermission, setRequestingPermission] = useState(false)
  const [supportsDeviceNotifications, setSupportsDeviceNotifications] = useState(false)
  const [pushStatus, setPushStatus] = useState<DevicePushStatus>('checking')
  const [pushSyncing, setPushSyncing] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

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

  // Load preferences on component mount
  useEffect(() => {
    void loadPreferences()
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

  const loadPreferences = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const response = await getNotificationPreferences()
      setState((prev) => ({
        ...prev,
        preferences: response.data,
        loading: false,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load notification preferences',
      }))
    }
  }

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
            // Handle specific subscription errors
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

  const handleRequestPermission = async () => {
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
  }

  const disableDeviceNotifications = useCallback(async () => {
    if (!supportsDeviceNotifications) return
    setPushSyncing(true)
    setPushError(null)
    try {
      const registration = await getServiceWorkerRegistration()
      if (!registration) throw new Error('Service worker is not ready yet.')

      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        // Delete from backend first
        try {
          await deletePushSubscription(subscription.endpoint)
        } catch (apiError) {
          console.warn('[notifications] Failed to delete subscription from backend:', apiError)
          // Continue with local unsubscribe even if backend fails
        }

        // Then unsubscribe locally
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

  const updatePreference = async (
    type: string,
    field: 'email_enabled' | 'in_app_enabled',
    value: boolean
  ) => {
    // Snapshot previous preferences so we can revert on error
    const previousPreferences = state.preferences

    try {
      setState((prev) => ({ ...prev, updating: true, error: null }))

      // Optimistically update the UI
      setState((prev) => ({
        ...prev,
        preferences: prev.preferences.map((pref) =>
          pref.type === type ? { ...pref, [field]: value } : pref
        ),
      }))

      // Find the current preference from the snapshot to get both values
      const currentPreference = previousPreferences.find((pref) => pref.type === type)
      if (!currentPreference) {
        throw new Error('Preference not found')
      }

      // Create the update request with both current values
      const updateRequest: UpdatePreferenceRequest = {
        type,
        email_enabled: field === 'email_enabled' ? value : currentPreference.email_enabled,
        in_app_enabled: field === 'in_app_enabled' ? value : currentPreference.in_app_enabled,
      }

      await updateNotificationPreferences([updateRequest])

      setState((prev) => ({
        ...prev,
        updating: false,
      }))

      toast.success('Settings saved')
    } catch (error) {
      // Revert the optimistic update on error and preserve the error message
      setState((prev) => ({
        ...prev,
        updating: false,
        error: error instanceof Error ? error.message : 'Failed to update preference',
        preferences: previousPreferences,
      }))
      // Do not reload preferences here because that would clear the error immediately
    }
  }

  if (state.loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Control how you receive notifications for different events.
          </p>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification Type</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead className="text-center">In-App</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-11 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-11 mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (state.error && state.preferences.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Control how you receive notifications for different events.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Control how you receive notifications for different events.
        </p>
      </div>

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

      {state.error && (
        <Alert variant="destructive" data-testid="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.preferences.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification Type</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead className="text-center">In-App</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.preferences.map((preference) => (
                <TableRow key={preference.type}>
                  <TableCell className="font-medium">{preference.label}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={preference.email_enabled}
                      onCheckedChange={(value) =>
                        void updatePreference(preference.type, 'email_enabled', value)
                      }
                      disabled={state.updating}
                      aria-label={`Toggle email notifications for ${preference.label}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={preference.in_app_enabled}
                      onCheckedChange={(value) =>
                        void updatePreference(preference.type, 'in_app_enabled', value)
                      }
                      disabled={state.updating}
                      aria-label={`Toggle in-app notifications for ${preference.label}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No notification types available.
        </p>
      )}
    </div>
  )
}
