import { useEffect, useRef } from 'react'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

export function useTelegramMiniAppAuth() {
  const { isAuthenticated, isLoading, loadUser } = useAuth()
  const attemptedRef = useRef<string | null>(null)

  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (!tg) {
      return
    }

    tg.ready()
    tg.expand()

    const initData = tg.initData

    if (!initData || isLoading || isAuthenticated) {
      return
    }

    if (attemptedRef.current === initData) {
      return
    }

    attemptedRef.current = initData

    void (async () => {
      try {
        await api.post('/auth/telegram/miniapp', {
          init_data: initData,
        })

        await loadUser()
      } catch (error) {
        console.warn('Telegram Mini App auth failed', error)
      }
    })()
  }, [isAuthenticated, isLoading, loadUser])
}
