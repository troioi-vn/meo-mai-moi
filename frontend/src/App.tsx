import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import MainNav from '@/components/layout/MainNav'
import { usePwaUpdate } from '@/hooks/use-pwa-update'
import { PageLoadingSpinner } from '@/components/ui/page-loading-spinner'

// Lazy loaded components
const MainPage = lazy(() => import('./pages/home/MainPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const EmailVerificationPage = lazy(() => import('./pages/auth/EmailVerificationPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const MyPetsPage = lazy(() => import('./pages/pets/MyPetsPage'))
const CreatePetPage = lazy(() => import('./pages/pets/CreatePetPage'))
const EditPetPage = lazy(() => import('./pages/pets/EditPetPage'))
const AccountPasswordPage = lazy(() => import('./pages/settings/AccountPasswordPage'))
const InvitationsPage = lazy(() => import('./pages/invitations/InvitationsPage'))
const PetProfilePage = lazy(() => import('./pages/pets/PetProfilePage'))
const PetPublicProfilePage = lazy(() => import('./pages/pets/PetPublicProfilePage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const HelperProfilePage = lazy(() => import('./pages/helper/HelperProfilePage'))
const HelperProfileEditPage = lazy(() => import('./pages/helper/HelperProfileEditPage'))
const CreateHelperProfilePage = lazy(() => import('./pages/helper/CreateHelperProfilePage'))
const HelperProfileViewPage = lazy(() => import('./pages/helper/HelperProfileViewPage'))
const NotFoundPage = lazy(() => import('./pages/errors/NotFoundPage'))
const RequestsPage = lazy(() => import('./pages/placement/RequestsPage'))
const RequestDetailPage = lazy(() => import('./pages/placement/RequestDetailPage'))
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage'))
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'))

import './App.css'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const user = auth.user
  const isLoading = auth.isLoading
  if (isLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

// Home page: shows MyPetsPage for authenticated users, MainPage for guests
function HomePage() {
  const auth = useAuth()
  const isLoading = auth.isLoading
  const isAuthenticated = Boolean(auth.user)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return isAuthenticated ? <MyPetsPage /> : <MainPage />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/requests/:id" element={<RequestDetailPage />} />

      {/* Pet routes */}
      <Route path="/pets/:id" element={<PetProfilePage />} />
      <Route path="/pets/:id/view" element={<PetPublicProfilePage />} />
      <Route
        path="/pets/:id/edit"
        element={
          <PrivateRoute>
            <EditPetPage />
          </PrivateRoute>
        }
      />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/email/verify/:id/:hash" element={<EmailVerificationPage />} />
      <Route path="/email/verify" element={<EmailVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/password/reset/:token" element={<ResetPasswordPage />} />
      <Route
        path="/settings/*"
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        }
      />

      {/* Pet routes */}
      <Route
        path="/pets/create"
        element={
          <PrivateRoute>
            <CreatePetPage />
          </PrivateRoute>
        }
      />
      {/* Redirect old /account/pets routes */}
      <Route path="/account/pets" element={<Navigate to="/" replace />} />
      <Route path="/account/pets/create" element={<Navigate to="/pets/create" replace />} />
      <Route
        path="/account/password"
        element={
          <PrivateRoute>
            <AccountPasswordPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/invitations"
        element={
          <PrivateRoute>
            <InvitationsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <NotificationsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/helper"
        element={
          <PrivateRoute>
            <HelperProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/helper/create"
        element={
          <PrivateRoute>
            <CreateHelperProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/helper/:id/edit"
        element={
          <PrivateRoute>
            <HelperProfileEditPage />
          </PrivateRoute>
        }
      />
      <Route path="/helper/:id" element={<HelperProfileViewPage />} />

      {/* Messages routes */}
      <Route
        path="/messages"
        element={
          <PrivateRoute>
            <MessagesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/messages/:chatId"
        element={
          <PrivateRoute>
            <MessagesPage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  const location = useLocation()

  // PWA update notification handler
  usePwaUpdate()

  // Show a toast if redirected with verified=1 (run after mount so Toaster is present)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(location.search)
    if (params.get('verified') === '1') {
      toast.success('Email verified successfully!')
      params.delete('verified')
      const hash = location.hash || ''
      const newUrl = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${hash}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [location.pathname, location.search, location.hash])

  return (
    <>
      <MainNav />
      <main className="pt-16">
        <Suspense fallback={<PageLoadingSpinner />}>
          <AppRoutes />
        </Suspense>
      </main>
      <Toaster />
    </>
  )
}
