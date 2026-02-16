import { useTelegramMiniAppAuth } from './use-telegram-miniapp-auth'

interface TelegramAuthOptions {
  autoAuthenticate?: boolean
}

export function useTelegramAuth(options: TelegramAuthOptions = {}) {
  const { autoAuthenticate = true } = options

  const miniApp = useTelegramMiniAppAuth({ autoAuthenticate })

  const isTelegramMiniApp = miniApp.isTelegramMiniApp && miniApp.canAuthenticateWithTelegram

  return {
    isTelegramMiniApp,
    isTelegramAvailable: isTelegramMiniApp,
    isAuthenticating: miniApp.isAuthenticating,
    authenticateWithTelegram: miniApp.authenticateWithTelegram,
  }
}
