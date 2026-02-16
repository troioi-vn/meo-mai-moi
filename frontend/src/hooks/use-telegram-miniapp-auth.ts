import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

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
        await api.post('/auth/telegram/miniapp', {
          init_data: initDataToUse,
          invitation_code: manualOptions?.invitationCode ?? undefined,
        })

        await loadUser()
        return true
      } catch (error) {
        console.warn('Telegram Mini App auth failed', error)
        return false
      } finally {
        setIsAuthenticating(false)
      }
    },
    [initData, isAuthenticated, isLoading, loadUser]
  )

  useEffect(() => {
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
