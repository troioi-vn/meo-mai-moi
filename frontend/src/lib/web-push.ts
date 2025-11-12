export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export interface PushSubscriptionJSON {
  endpoint: string
  expirationTime?: number | null
  keys?: {
    p256dh?: string
    auth?: string
  }
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

export function normaliseSubscriptionJSON(
  subscription: PushSubscription | PushSubscriptionJSON | null
) {
  if (!subscription) return null
  const raw =
    typeof (subscription as PushSubscription).toJSON === 'function'
      ? (subscription as PushSubscription).toJSON()
      : subscription
  const json = raw as PushSubscriptionJSON
  if (!json.endpoint) {
    return null
  }
  const keys = json.keys ?? {}
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: keys.p256dh ?? '',
      auth: keys.auth ?? '',
    },
    expirationTime: json.expirationTime ?? null,
  }
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Notification.permission !== 'denied'
  )
}
