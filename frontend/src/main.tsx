import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './components/shared/theme-provider'
import './i18n' // Initialize i18n before rendering
import './index.css'
// Note: Echo is lazy-loaded in useMessaging hook to avoid WebSocket errors when Reverb isn't running
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, persistOptions } from '@/lib/query-cache'
import { resumeOfflinePetMutations, setupMutationDefaults } from '@/lib/offline-mutations'
import { setupOnlineManager } from '@/lib/online-manager'
import { processQueue, setupMediaUploadQueue } from '@/lib/media-upload-queue'
import { NotificationsProvider } from './contexts/NotificationProvider'
import { initPwaServiceWorker } from './pwa'

// Register PWA service worker (kept out of tests by design).
initPwaServiceWorker()
setupOnlineManager()
setupMutationDefaults(queryClient)
setupMediaUploadQueue()

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AuthProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={persistOptions}
            onSuccess={() => {
              void resumeOfflinePetMutations(queryClient)
              void processQueue()
            }}
          >
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </PersistQueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
