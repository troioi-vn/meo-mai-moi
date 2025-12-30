import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './components/shared/theme-provider'
import './index.css'
// Note: Echo is lazy-loaded in useMessaging hook to avoid WebSocket errors when Reverb isn't running
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationProvider } from './contexts/NotificationProvider'
import { registerSW } from 'virtual:pwa-register'

const queryClient = new QueryClient()

// Enhanced service worker registration for PWA
// Provides update detection, periodic checks, and iOS focus-based updates
let swRegistration: ServiceWorkerRegistration | undefined
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let needsRefreshCallback: (() => void) | null = null

export function setNeedsRefreshCallback(callback: (() => void) | null) {
  needsRefreshCallback = callback
}

export function triggerAppUpdate() {
  if (updateSW) {
    void updateSW(true)
  }
}

if ('serviceWorker' in navigator) {
  updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      console.log('[PWA] New version available')
      if (needsRefreshCallback) {
        needsRefreshCallback()
      }
    },

    onOfflineReady() {
      console.log('[PWA] App ready to work offline')
    },

    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service worker registered:', swUrl)
      swRegistration = registration

      if (registration) {
        // Periodic update checks every hour for long-lived sessions
        setInterval(
          () => {
            console.log('[PWA] Checking for updates...')
            registration.update().catch((err: unknown) => {
              console.warn('[PWA] Update check failed:', err)
            })
          },
          60 * 60 * 1000
        )
      }
    },

    onRegisterError(error) {
      console.error('[PWA] Registration failed:', error)
    },
  })

  // iOS/Safari: Check for updates when app regains focus
  // iOS doesn't check as frequently in background
  window.addEventListener('focus', () => {
    if (swRegistration) {
      console.log('[PWA] Focus event - checking for updates')
      swRegistration.update().catch(() => {
        // Ignore errors on focus check
      })
    }
  })
}

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
