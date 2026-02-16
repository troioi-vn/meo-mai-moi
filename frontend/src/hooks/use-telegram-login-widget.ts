import { useCallback, useState } from 'react'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

interface TelegramLoginWidgetOptions {
  botId: number
  invitationCode?: string | null
}

const WIDGET_SCRIPT_URL = 'https://telegram.org/js/telegram-widget.js?22'

let scriptLoadPromise: Promise<boolean> | null = null

/**
 * Dynamically load the Telegram Login Widget script.
 * Preserves window.Telegram.WebApp if it was set by telegram-web-app.js.
 */
function loadWidgetScript(): Promise<boolean> {
  if (window.Telegram?.Login?.auth) {
    return Promise.resolve(true)
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve) => {
    // Save existing Telegram.WebApp before the widget script may overwrite it
    const existingWebApp = window.Telegram?.WebApp

    const script = document.createElement('script')
    script.src = WIDGET_SCRIPT_URL
    script.async = true

    script.onload = () => {
      // Restore WebApp if the widget script overwrote window.Telegram
      if (existingWebApp && window.Telegram && !window.Telegram.WebApp) {
        window.Telegram.WebApp = existingWebApp
      }
      resolve(Boolean(window.Telegram?.Login?.auth))
    }

    script.onerror = () => {
      scriptLoadPromise = null
      resolve(false)
    }

    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

export function useTelegramLoginWidget() {
  const { isAuthenticated, loadUser } = useAuth()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const authenticateWithWidget = useCallback(
    async (options: TelegramLoginWidgetOptions): Promise<boolean> => {
      if (isAuthenticated || !options.botId) {
        return false
      }

      const loaded = await loadWidgetScript()
      if (!loaded || !window.Telegram?.Login?.auth) {
        console.warn('Telegram Login Widget script failed to load')
        return false
      }

      return new Promise((resolve) => {
        setIsAuthenticating(true)

        window.Telegram!.Login!.auth(
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
