import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

import MainPage from './pages/MainPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import MyCatsPage from './pages/account/MyCatsPage'
import CreateCatPage from './pages/account/CreateCatPage'
import EditCatPage from './pages/account/EditCatPage'
import CatProfilePage from './pages/CatProfilePage'
import NotFoundPage from './pages/NotFoundPage'
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

export default function App() {
  return (
    <>
      <MainNav />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/cats/:id" element={<CatProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<Navigate to="/profile" replace />} />
          <Route
            path="/profile"
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
            path="/account/cats/:id/edit"
            element={
              <PrivateRoute>
                <EditCatPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Toaster />
    </>
  )
}
