import { useCallback, useState } from 'react'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

interface TelegramLoginWidgetOptions {
  botId: number
  invitationCode?: string | null
}

export function useTelegramLoginWidget() {
  const { isAuthenticated, loadUser } = useAuth()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const authenticateWithWidget = useCallback(
    (options: TelegramLoginWidgetOptions): Promise<boolean> => {
      if (isAuthenticated || !options.botId) {
        return Promise.resolve(false)
      }

      return new Promise((resolve) => {
        if (!window.Telegram?.Login?.auth) {
          console.warn('Telegram Login Widget script not loaded')
          resolve(false)
          return
        }

        setIsAuthenticating(true)

        window.Telegram.Login.auth(
          { bot_id: options.botId, request_access: 'write' },
          (data) => {
            if (!data) {
              // User cancelled the popup
              setIsAuthenticating(false)
              resolve(false)
              return
            }

            void (async () => {
              try {
                await api.post('/auth/telegram/widget', {
                  ...data,
                  invitation_code: options.invitationCode ?? undefined,
                })
                await loadUser()
                resolve(true)
              } catch (error) {
                console.warn('Telegram Login Widget auth failed', error)
                resolve(false)
              } finally {
                setIsAuthenticating(false)
              }
            })()
          }
        )
      })
    },
    [isAuthenticated, loadUser]
  )

  return { isAuthenticating, authenticateWithWidget }
}
