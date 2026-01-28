/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, use, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getUnifiedNotifications, markAllRead, markRead } from '@/api/notifications'
import type { AppNotification, NotificationLevel } from '@/types/notification'
import { AuthContext } from '@/contexts/auth-context'
import { getServiceWorkerRegistration } from '@/lib/web-push'
import type { Channel } from 'laravel-echo'
import { getEcho } from '@/lib/echo'

interface NotificationContextValue {
  bellNotifications: AppNotification[]
  unreadBellCount: number
  unreadMessageCount: number
  loading: boolean
  refresh: (opts?: { includeBellNotifications?: boolean }) => Promise<void>
  markBellRead: (id: string) => Promise<void>
  applyBellUpdate: (payload: { notification: AppNotification; unreadBellCount?: number }) => void
  markAllBellReadNow: () => Promise<void>
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

const DEFAULT_BELL_LIMIT = 20

const LEVEL_TO_TOAST: Record<
  NotificationLevel,
  (
    message: string,
    options?: { description?: string; action?: { label: string; onClick: () => void } }
  ) => void
> = {
  info: (message, opts) =>
    toast.info(message, { description: opts?.description, action: opts?.action }),
  success: (message, opts) =>
    toast.success(message, { description: opts?.description, action: opts?.action }),
  warning: (message, opts) =>
    toast.warning(message, { description: opts?.description, action: opts?.action }),
  error: (message, opts) =>
    toast.error(message, { description: opts?.description, action: opts?.action }),
}

function useVisibility(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true
  )
  useEffect(() => {
    const onChange = () => {
      setVisible(document.visibilityState !== 'hidden')
    }
    document.addEventListener('visibilitychange', onChange)
    return () => {
      document.removeEventListener('visibilitychange', onChange)
    }
  }, [])
  return visible
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bellNotifications, setBellNotifications] = useState<AppNotification[]>([])
  const [unreadBellCount, setUnreadBellCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [suppressNativeNotifications, setSuppressNativeNotifications] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const refreshRef = useRef<(() => Promise<void>) | null>(null)
  const visible = useVisibility()

  const auth = use(AuthContext)
  const user = auth?.user ?? null
  const isAuthenticated = auth?.isAuthenticated ?? false
  const userId = user?.id ?? null
  const isVerified = Boolean(user?.email_verified_at)

  // If the user has device push enabled (service worker + push subscription), the service worker
  // will already display OS notifications. Suppress in-page native notifications to avoid doubles.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setSuppressNativeNotifications(false)
      return
    }

    if (Notification.permission !== 'granted') {
      setSuppressNativeNotifications(false)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const registration = await getServiceWorkerRegistration()
        const subscription = registration ? await registration.pushManager.getSubscription() : null
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!cancelled) {
          setSuppressNativeNotifications(Boolean(subscription))
        }
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!cancelled) {
          setSuppressNativeNotifications(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visible, isAuthenticated, userId])

  const showNativeNotification = useCallback(
    (notification: AppNotification) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return
      if (Notification.permission !== 'granted') return
      if (suppressNativeNotifications) return

      if (typeof document !== 'undefined') {
        const isVisible = document.visibilityState === 'visible'
        const hasFocus = typeof document.hasFocus === 'function' ? document.hasFocus() : true
        if (isVisible && hasFocus) return
      }

      const options: NotificationOptions = {
        body: notification.body ?? undefined,
        tag: notification.id,
        data: notification.url ? { url: notification.url } : undefined,
      }

      const showWithWindowContext = () => {
        const fallback = new Notification(notification.title, options)
        fallback.onclick = () => {
          if (typeof window !== 'undefined') {
            window.focus()
            if (notification.url) {
              window.location.assign(notification.url)
            }
          }
        }
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistration()
          .then((registration) => {
            if (registration) {
              return registration.showNotification(notification.title, options)
            }
            // Fall back to Notification constructor if no registration available
            showWithWindowContext()
          })
          .catch(() => {
            // On failure, try direct notification constructor as a last resort
            showWithWindowContext()
          })
      } else {
        showWithWindowContext()
      }
    },
    [suppressNativeNotifications]
  )

  const emitToastsForNew = useCallback(
    (incoming: AppNotification[]) => {
      for (const n of incoming) {
        if (!n.read_at && !seenIdsRef.current.has(n.id)) {
          seenIdsRef.current.add(n.id)
          const fn = LEVEL_TO_TOAST[n.level]
          fn(n.title, { description: n.body ?? undefined })
          showNativeNotification(n)
        }
      }
    },
    [showNativeNotification]
  )

  const refresh = useCallback(
    async (opts?: { includeBellNotifications?: boolean }) => {
      if (!isAuthenticated || !userId || !isVerified) {
        setBellNotifications([])
        setUnreadBellCount(0)
        setUnreadMessageCount(0)
        return
      }

      setLoading(true)
      try {
        const includeBellNotifications = opts?.includeBellNotifications ?? false

        const data = await getUnifiedNotifications({
          limit: DEFAULT_BELL_LIMIT,
          includeBellNotifications,
        })

        setUnreadBellCount(data.unread_bell_count)
        setUnreadMessageCount(data.unread_message_count)

        if (includeBellNotifications) {
          // de-dup by id, newest first assuming server returns sorted
          const byId = new Map<string, AppNotification>()
          for (const n of data.bell_notifications) byId.set(n.id, n)
          const list = Array.from(byId.values())
          setBellNotifications(list)
          emitToastsForNew(list)
        }
      } catch (error) {
        console.error('Error fetching unified notifications:', error)
      } finally {
        setLoading(false)
      }
    },
    [emitToastsForNew, isAuthenticated, isVerified, userId]
  )

  const upsertBellNotification = useCallback((incoming: AppNotification) => {
    setBellNotifications((prev) => {
      const next = [incoming, ...prev.filter((n) => n.id !== incoming.id)]
      return next.slice(0, DEFAULT_BELL_LIMIT)
    })
  }, [])

  const hasBellListLoaded = bellNotifications.length > 0

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  // Real-time updates via Echo/Reverb (no polling)
  useEffect(() => {
    if (!isAuthenticated || !user || !isVerified) return

    let active = true
    let channel: Channel | null = null

    const setupEcho = async () => {
      const echoInstance = await getEcho()
      if (!echoInstance || !active) return

      channel = echoInstance.private(`App.Models.User.${user.id.toString()}`)

      channel.listen('.App\\Events\\MessageSent', () => {
        // Fetch counts-only to keep updates lightweight
        if (active) void refresh({ includeBellNotifications: false })
      })
      channel.listen(
        '.App\\Events\\NotificationCreated',
        (event: { notification?: AppNotification; unread_bell_count?: number }) => {
          if (!active) return
          if (typeof event.unread_bell_count === 'number') {
            setUnreadBellCount(event.unread_bell_count)
          } else {
            // Fallback: make sure badge moves even if backend doesn't send the count
            setUnreadBellCount((prev) => prev + 1)
          }

          if (event.notification) {
            // Only maintain the in-memory list if the user has opened the /notifications page
            // (which triggers a list fetch). Otherwise counts-only mode keeps memory light.
            if (hasBellListLoaded) {
              upsertBellNotification(event.notification)
            }
            emitToastsForNew([event.notification])
          }

          // Authoritative counts can diverge between sessions (mark read elsewhere).
          // Keep message count in sync as well by a counts-only refresh.
          void refresh({ includeBellNotifications: false })
        }
      )
      channel.listen(
        '.App\\Events\\NotificationRead',
        (event: { notification_id?: string | null; all?: boolean; unread_bell_count?: number }) => {
          if (!active) return
          if (typeof event.unread_bell_count === 'number') {
            setUnreadBellCount(event.unread_bell_count)
          }

          if (event.all) {
            const now = new Date().toISOString()
            setBellNotifications((prev) =>
              prev.map((n) => (n.read_at ? n : { ...n, read_at: now }))
            )
            return
          }

          const id = event.notification_id
          if (id) {
            const now = new Date().toISOString()
            setBellNotifications((prev) =>
              prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? now } : n))
            )
          }
        }
      )
    }

    void setupEcho()

    return () => {
      active = false
      if (channel) {
        channel.stopListening('.App\\Events\\MessageSent')
        channel.stopListening('.App\\Events\\NotificationCreated')
        channel.stopListening('.App\\Events\\NotificationRead')
      }
    }
  }, [
    emitToastsForNew,
    hasBellListLoaded,
    isAuthenticated,
    isVerified,
    refresh,
    upsertBellNotification,
    user,
  ])

  // Reset and refetch when the authenticated user changes
  // This effect handles both initial load and user changes
  useEffect(() => {
    // Clear local state to avoid showing previous user's notifications
    setBellNotifications([])
    setUnreadBellCount(0)
    setUnreadMessageCount(0)
    seenIdsRef.current.clear()
    if (isAuthenticated && userId && isVerified) {
      void refreshRef.current?.()
    }
  }, [isAuthenticated, isVerified, userId])

  const markAllBellReadNow = useCallback(async () => {
    if (unreadBellCount === 0) return
    setUnreadBellCount(0)
    setBellNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    )
    try {
      await markAllRead()
    } catch {
      await refresh({ includeBellNotifications: true })
    }
  }, [refresh, unreadBellCount])

  const markBellRead = useCallback(
    async (id: string) => {
      setBellNotifications((prev) => {
        const wasUnread = prev.some((n) => n.id === id && !n.read_at)
        if (wasUnread) {
          setUnreadBellCount((count) => Math.max(0, count - 1))
        }

        return prev.map((n) =>
          n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n
        )
      })
      try {
        await markRead(id)
      } catch {
        await refresh({ includeBellNotifications: true })
      }
    },
    [refresh]
  )

  const applyBellUpdate = useCallback(
    (payload: { notification: AppNotification; unreadBellCount?: number }) => {
      const incoming = payload.notification
      setBellNotifications((prev) => {
        const next = [incoming, ...prev.filter((n) => n.id !== incoming.id)]
        return next.slice(0, DEFAULT_BELL_LIMIT)
      })

      if (typeof payload.unreadBellCount === 'number') {
        setUnreadBellCount(payload.unreadBellCount)
      }
    },
    []
  )

  const value = useMemo<NotificationContextValue>(
    () => ({
      bellNotifications,
      unreadBellCount,
      unreadMessageCount,
      loading,
      refresh,
      markBellRead,
      applyBellUpdate,
      markAllBellReadNow,
    }),
    [
      bellNotifications,
      applyBellUpdate,
      loading,
      markAllBellReadNow,
      markBellRead,
      refresh,
      unreadBellCount,
      unreadMessageCount,
    ]
  )

  return <NotificationContext value={value}>{children}</NotificationContext>
}

export function useNotifications() {
  const ctx = use(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
