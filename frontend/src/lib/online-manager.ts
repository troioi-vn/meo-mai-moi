import { onlineManager } from '@tanstack/react-query'

let isOnlineManagerConfigured = false
export const OFFLINE_CONFIRMATION_DELAY_MS = 750

export function setupOnlineManager() {
  if (isOnlineManagerConfigured || typeof window === 'undefined') {
    return
  }

  isOnlineManagerConfigured = true

  onlineManager.setEventListener((setOnline) => {
    let offlineConfirmationTimer: number | null = null

    const clearOfflineConfirmation = () => {
      if (offlineConfirmationTimer === null) {
        return
      }

      window.clearTimeout(offlineConfirmationTimer)
      offlineConfirmationTimer = null
    }

    const publishOnlineState = (isOnline: boolean) => {
      if (isOnline) {
        clearOfflineConfirmation()
        setOnline(true)
        return
      }

      clearOfflineConfirmation()
      offlineConfirmationTimer = window.setTimeout(() => {
        offlineConfirmationTimer = null

        if (!window.navigator.onLine) {
          setOnline(false)
        }
      }, OFFLINE_CONFIRMATION_DELAY_MS)
    }

    const updateOnlineState = () => {
      publishOnlineState(window.navigator.onLine)
    }

    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)

    updateOnlineState()

    return () => {
      clearOfflineConfirmation()
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  })
}
