import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './components/theme-provider'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationProvider } from './contexts/NotificationProvider'
import { registerSW } from 'virtual:pwa-register'

type RegisterSW = (options?: { immediate?: boolean }) => () => Promise<void>

const queryClient = new QueryClient()

// Register service worker for PWA (manual because HTML is served by Blade)
const activateServiceWorker = registerSW as RegisterSW | undefined
if (activateServiceWorker) {
  void activateServiceWorker({ immediate: true })
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
