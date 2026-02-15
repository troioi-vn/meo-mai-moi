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

  const telegramWebApp = window.Telegram?.WebApp
  const initData = telegramWebApp?.initData?.trim() ?? ''
  const isTelegramMiniApp = Boolean(telegramWebApp)
  const canAuthenticateWithTelegram = initData.length > 0

  const authenticateWithTelegram = useCallback(
    async (manualOptions?: TelegramMiniAppManualOptions): Promise<boolean> => {
      if (isLoading || isAuthenticated || !canAuthenticateWithTelegram) {
        return false
      }

      setIsAuthenticating(true)

      try {
        await api.post('/auth/telegram/miniapp', {
          init_data: initData,
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
    [canAuthenticateWithTelegram, initData, isAuthenticated, isLoading, loadUser]
  )

  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (!tg || !autoAuthenticate) {
      return
    }

    tg.ready()
    tg.expand()

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
    isTelegramMiniApp,
  ])

  return {
    isTelegramMiniApp,
    canAuthenticateWithTelegram,
    isAuthenticating,
    authenticateWithTelegram,
  }
}
