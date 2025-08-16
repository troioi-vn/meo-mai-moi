import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './components/theme-provider'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationProvider } from './contexts/NotificationProvider'

const queryClient = new QueryClient()

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
