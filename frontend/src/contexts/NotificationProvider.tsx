/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, use, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getNotifications, markAllRead, markRead } from '@/api/notifications'
import type { AppNotification, NotificationLevel } from '@/types/notification'

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  setDropdownOpen: (open: boolean) => void
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

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

export const NotificationProvider: React.FC<{ children: React.ReactNode; pollMs?: number }> = ({
  children,
  pollMs = 30000,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const isDropdownOpenRef = useRef(false)
  const visible = useVisibility()

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications])

  const emitToastsForNew = useCallback((incoming: AppNotification[]) => {
    for (const n of incoming) {
      if (!n.read_at && !seenIdsRef.current.has(n.id)) {
        seenIdsRef.current.add(n.id)
        const fn = LEVEL_TO_TOAST[n.level]
        fn(n.title, { description: n.body ?? undefined })
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getNotifications({ status: 'all', page: 1 })
      // de-dup by id, newest first assuming server returns sorted
      const byId = new Map<string, AppNotification>()
      for (const n of data) byId.set(n.id, n)
      const list = Array.from(byId.values())
      setNotifications(list)
      emitToastsForNew(list)
    } finally {
      setLoading(false)
    }
  }, [emitToastsForNew])

  // polling
  useEffect(() => {
    let timer: number | undefined
    const tick = () => {
      if (!visible) {
        timer = window.setTimeout(tick, pollMs)
        return
      }
      void refresh()
      timer = window.setTimeout(tick, pollMs)
    }
    timer = window.setTimeout(tick, pollMs)
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [pollMs, refresh, visible])

  // initial fetch to populate badge quickly
  useEffect(() => {
    void refresh()
  }, [refresh])

  // Mark all read when dropdown opens
  const setDropdownOpen = useCallback(
    (open: boolean) => {
      isDropdownOpenRef.current = open
      if (open && unreadCount > 0) {
        void (async () => {
          // optimistic
          setNotifications((prev) =>
            prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
          )
          try {
            await markAllRead()
          } catch {
            // on failure, refetch
            await refresh()
          }
        })()
      }
    },
    [refresh, unreadCount]
  )

  const markOneRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n
        )
      )
      try {
        await markRead(id)
      } catch {
        await refresh()
      }
    },
    [refresh]
  )

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead: markOneRead,
      setDropdownOpen,
    }),
    [loading, markOneRead, notifications, refresh, setDropdownOpen, unreadCount]
  )

  return <NotificationContext value={value}>{children}</NotificationContext>
}

export function useNotifications() {
  const ctx = use(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
