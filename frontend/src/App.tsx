import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import MainNav from '@/components/layout/MainNav'
import { usePwaUpdate } from '@/hooks/use-pwa-update'

import MainPage from './pages/home/MainPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import EmailVerificationPage from './pages/auth/EmailVerificationPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import MyPetsPage from './pages/pets/MyPetsPage'
import CreatePetPage from './pages/pets/CreatePetPage'
import EditPetPage from './pages/pets/EditPetPage'
import AccountPasswordPage from './pages/settings/AccountPasswordPage'
import InvitationsPage from './pages/invitations/InvitationsPage'
import PetProfilePage from './pages/pets/PetProfilePage'
import PetPublicProfilePage from './pages/pets/PetPublicProfilePage'
import SettingsPage from './pages/settings/SettingsPage'
import HelperProfilePage from './pages/helper/HelperProfilePage'
import HelperProfileEditPage from './pages/helper/HelperProfileEditPage'
import CreateHelperProfilePage from './pages/helper/CreateHelperProfilePage'
import HelperProfileViewPage from './pages/helper/HelperProfileViewPage'
import NotFoundPage from './pages/errors/NotFoundPage'
import RequestsPage from './pages/placement/RequestsPage'
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

      {/* Pet routes */}
      <Route path="/pets/:id" element={<PetProfilePage />} />
      <Route path="/pets/:id/public" element={<PetPublicProfilePage />} />
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
        <AppRoutes />
      </main>
      <Toaster />
    </>
  )
}
