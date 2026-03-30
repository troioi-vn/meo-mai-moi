import { onlineManager } from '@tanstack/react-query'

let isOnlineManagerConfigured = false

export function setupOnlineManager() {
  if (isOnlineManagerConfigured || typeof window === 'undefined') {
    return
  }

  isOnlineManagerConfigured = true

  onlineManager.setEventListener((setOnline) => {
    const updateOnlineState = () => {
      setOnline(window.navigator.onLine)
    }

    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)

    updateOnlineState()

    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  })
}
