import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './components/shared/theme-provider'
import './i18n' // Initialize i18n before rendering
import './index.css'
// Note: Echo is lazy-loaded in useMessaging hook to avoid WebSocket errors when Reverb isn't running
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationsProvider } from './contexts/NotificationProvider'
import { initPwaServiceWorker } from './pwa'

const queryClient = new QueryClient()

// Register PWA service worker (kept out of tests by design).
initPwaServiceWorker()

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
