import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

import MainPage from './pages/MainPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import MyCatsPage from './pages/account/MyCatsPage'
import CreateCatPage from './pages/account/CreateCatPage'
import EditCatPage from './pages/account/EditCatPage'
import NotificationsPage from './pages/account/NotificationsPage'
import CatProfilePage from './pages/CatProfilePage'
import HelperProfilePage from './pages/helper/HelperProfilePage'
import HelperProfileEditPage from './pages/helper/HelperProfileEditPage'
import CreateHelperProfilePage from './pages/helper/CreateHelperProfilePage'
import HelperProfileViewPage from './pages/helper/HelperProfileViewPage'
import NotFoundPage from './pages/NotFoundPage'
import RequestsPage from './pages/RequestsPage'
import { Toaster } from '@/components/ui/sonner'
import MainNav from '@/components/MainNav'
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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/cats/:id" element={<CatProfilePage />} />
      <Route
        path="/cats/:id/edit"
        element={
          <PrivateRoute>
            <EditCatPage />
          </PrivateRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/account"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/account/cats"
        element={
          <PrivateRoute>
            <MyCatsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/account/cats/create"
        element={
          <PrivateRoute>
            <CreateCatPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/account/notifications"
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
      <Route
        path="/helper/:id"
        element={<HelperProfileViewPage />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
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
