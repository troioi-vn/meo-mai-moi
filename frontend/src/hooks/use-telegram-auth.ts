import { useCallback } from 'react'
import { useTelegramMiniAppAuth } from './use-telegram-miniapp-auth'
import { useTelegramLoginWidget } from './use-telegram-login-widget'

interface TelegramAuthOptions {
  autoAuthenticate?: boolean
  botId: number | null
}

export function useTelegramAuth(options: TelegramAuthOptions) {
  const { autoAuthenticate = true, botId } = options

  const miniApp = useTelegramMiniAppAuth({ autoAuthenticate })
  const widget = useTelegramLoginWidget()

  const isTelegramMiniApp = miniApp.isTelegramMiniApp && miniApp.canAuthenticateWithTelegram
  const isAuthenticating = miniApp.isAuthenticating || widget.isAuthenticating

  // Telegram auth is available if Mini App context with initData, or bot is configured for widget
  const isTelegramAvailable = isTelegramMiniApp || (botId !== null && botId > 0)

  const authenticateWithTelegram = useCallback(
    async (opts?: { invitationCode?: string | null }): Promise<boolean> => {
      // In Mini App context with initData, use Mini App auth
      if (isTelegramMiniApp) {
        return miniApp.authenticateWithTelegram(opts)
      }

      // In browser context, use Login Widget popup
      if (botId) {
        return widget.authenticateWithWidget({
          botId,
          invitationCode: opts?.invitationCode,
        })
      }

      return false
    },
    [isTelegramMiniApp, botId, miniApp, widget]
  )

  return {
    isTelegramMiniApp,
    isTelegramAvailable,
    isAuthenticating,
    authenticateWithTelegram,
  }
}
