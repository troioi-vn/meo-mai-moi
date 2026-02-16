import { useCallback, useEffect, useRef, useState } from 'react'
import { api, csrf } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

interface TelegramMiniAppAuthOptions {
  autoAuthenticate?: boolean
}

interface TelegramMiniAppManualOptions {
  invitationCode?: string | null
}

const TG_LOGOUT_FLAG = 'telegram_auth_disabled'

/**
 * Extract and consume a `tg_token` from the URL query string.
 * Returns the token value and removes it from the URL to keep it clean.
 * Also clears the logout flag since the user explicitly opened via Telegram.
 */
function consumeTgTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('tg_token')
  if (!token) return null

  // Fresh open from Telegram — clear any previous logout flag
  try {
    sessionStorage.removeItem(TG_LOGOUT_FLAG)
  } catch {
    // noop (private browsing)
  }

  // Remove token from URL to keep it clean
  params.delete('tg_token')
  const newSearch = params.toString()
  const newUrl =
    window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash
  window.history.replaceState({}, '', newUrl)

  return token
}

export function useTelegramMiniAppAuth(options: TelegramMiniAppAuthOptions = {}) {
  const { autoAuthenticate = true } = options
  const { isAuthenticated, isLoading, loadUser } = useAuth()
  const attemptedRef = useRef<string | null>(null)
  const tokenAttemptedRef = useRef(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // One-time token from URL (consumed on first read)
  const [tgToken] = useState(() => (typeof window !== 'undefined' ? consumeTgTokenFromUrl() : null))

  const [telegramContext, setTelegramContext] = useState<{
    isTelegramMiniApp: boolean
    initData: string
  }>({
    isTelegramMiniApp: false,
    initData: '',
  })

  const isTelegramMiniApp = telegramContext.isTelegramMiniApp
  const initData = telegramContext.initData
  const canAuthenticateWithTelegram = initData.length > 0 || !!tgToken

  // Detect Telegram WebApp context and poll for delayed initData
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

    // If we have a tg_token, no need to poll for initData
    if (tgToken) {
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
  }, [tgToken])

  // Authenticate via initData (standard Mini App flow)
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
        return false
      } finally {
        setIsAuthenticating(false)
      }
    },
    [initData, isAuthenticated, isLoading, loadUser]
  )

  // Authenticate via one-time URL token (fallback for clients without WebApp SDK)
  const authenticateWithToken = useCallback(
    async (token: string): Promise<boolean> => {
      if (isLoading || isAuthenticated) {
        return false
      }

      setIsAuthenticating(true)

      try {
        await csrf()
        await api.post('/auth/telegram/token', { token })
        await loadUser()
        return true
      } catch (error) {
        console.warn('Telegram token auth failed', error)
        return false
      } finally {
        setIsAuthenticating(false)
      }
    },
    [isAuthenticated, isLoading, loadUser]
  )

  // Mark that the user explicitly logged out — prevents auto-auth re-login loop
  const disableAutoAuth = useCallback(() => {
    try {
      sessionStorage.setItem(TG_LOGOUT_FLAG, '1')
    } catch {
      // noop (private browsing)
    }
  }, [])

  // Auto-authenticate: try initData first, then fall back to tg_token
  useEffect(() => {
    if (!autoAuthenticate || isLoading || isAuthenticated) {
      return
    }

    // Skip auto-auth if user explicitly logged out in this session
    try {
      if (sessionStorage.getItem(TG_LOGOUT_FLAG)) {
        return
      }
    } catch {
      // noop
    }

    // Path 1: initData available (standard Mini App)
    if (initData.length > 0 && attemptedRef.current !== initData) {
      attemptedRef.current = initData
      void authenticateWithTelegram()
      return
    }

    // Path 2: URL token available (fallback)
    if (tgToken && !tokenAttemptedRef.current) {
      tokenAttemptedRef.current = true
      void authenticateWithToken(tgToken)
    }
  }, [
    authenticateWithTelegram,
    authenticateWithToken,
    autoAuthenticate,
    initData,
    isAuthenticated,
    isLoading,
    tgToken,
  ])

  return {
    isTelegramMiniApp,
    canAuthenticateWithTelegram,
    isAuthenticating,
    authenticateWithTelegram,
    disableAutoAuth,
  }
}
