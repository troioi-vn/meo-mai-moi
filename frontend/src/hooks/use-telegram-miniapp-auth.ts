import { useCallback, useEffect, useRef, useState } from 'react'
import { api, csrf } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

// DEBUG: Send diagnostic info to backend (temporary)
function debugBeacon(step: string, data: Record<string, unknown>) {
  try {
    fetch('/api/debug/telegram-beacon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ step, ...data, ts: Date.now() }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // noop
  }
}

interface TelegramMiniAppAuthOptions {
  autoAuthenticate?: boolean
}

interface TelegramMiniAppManualOptions {
  invitationCode?: string | null
}

export function useTelegramMiniAppAuth(options: TelegramMiniAppAuthOptions = {}) {
  const { autoAuthenticate = true } = options
  const { isAuthenticated, isLoading, loadUser } = useAuth()
  const attemptedRef = useRef<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const [telegramContext, setTelegramContext] = useState<{
    isTelegramMiniApp: boolean
    initData: string
  }>({
    isTelegramMiniApp: false,
    initData: '',
  })

  const isTelegramMiniApp = telegramContext.isTelegramMiniApp
  const initData = telegramContext.initData
  const canAuthenticateWithTelegram = initData.length > 0

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    debugBeacon('hook-mount', {
      hasTelegram: !!window.Telegram,
      hasWebApp: !!window.Telegram?.WebApp,
      initDataLength: window.Telegram?.WebApp?.initData?.length ?? -1,
      userAgent: navigator.userAgent.slice(0, 120),
    })

    const syncTelegramContext = (): boolean => {
      const tg = window.Telegram?.WebApp
      if (!tg) {
        return false
      }

      const nextInitData = tg.initData?.trim() ?? ''

      setTelegramContext((prev) => {
        if (prev.isTelegramMiniApp && prev.initData === nextInitData) {
          return prev
        }

        return {
          isTelegramMiniApp: true,
          initData: nextInitData,
        }
      })

      try {
        tg.ready()
        tg.expand()
      } catch {
        // noop
      }

      return nextInitData.length > 0
    }

    if (syncTelegramContext()) {
      debugBeacon('sync-immediate', { initDataLength: window.Telegram?.WebApp?.initData?.length ?? 0 })
      return
    }

    let attempts = 0
    const maxAttempts = 100
    const intervalId = window.setInterval(() => {
      attempts += 1
      const foundInitData = syncTelegramContext()
      if (foundInitData || attempts >= maxAttempts) {
        window.clearInterval(intervalId)
      }
    }, 200)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const authenticateWithTelegram = useCallback(
    async (manualOptions?: TelegramMiniAppManualOptions): Promise<boolean> => {
      if (isLoading || isAuthenticated) {
        return false
      }

      const runtimeInitData = window.Telegram?.WebApp?.initData?.trim() ?? ''
      const initDataToUse = initData || runtimeInitData

      if (initDataToUse.length === 0) {
        return false
      }

      setIsAuthenticating(true)

      try {
        await csrf()

        await api.post('/auth/telegram/miniapp', {
          init_data: initDataToUse,
          invitation_code: manualOptions?.invitationCode ?? undefined,
        })

        await loadUser()
        return true
      } catch (error) {
        console.warn('Telegram Mini App auth failed', error)
        debugBeacon('auth-error', {
          message: error instanceof Error ? error.message : String(error),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: (error as any)?.response?.status,
        })
        return false
      } finally {
        setIsAuthenticating(false)
      }
    },
    [initData, isAuthenticated, isLoading, loadUser]
  )

  useEffect(() => {
    debugBeacon('auto-auth-effect', {
      autoAuthenticate,
      canAuthenticateWithTelegram,
      isLoading,
      isAuthenticated,
      initDataLength: initData.length,
      alreadyAttempted: attemptedRef.current === initData,
    })

    if (!autoAuthenticate) {
      return
    }

    if (!canAuthenticateWithTelegram || isLoading || isAuthenticated) {
      return
    }

    if (attemptedRef.current === initData) {
      return
    }

    attemptedRef.current = initData

    debugBeacon('auto-auth-calling', { initDataLength: initData.length })
    void authenticateWithTelegram()
  }, [
    authenticateWithTelegram,
    autoAuthenticate,
    canAuthenticateWithTelegram,
    initData,
    isAuthenticated,
    isLoading,
  ])

  return {
    isTelegramMiniApp,
    canAuthenticateWithTelegram,
    isAuthenticating,
    authenticateWithTelegram,
  }
}
