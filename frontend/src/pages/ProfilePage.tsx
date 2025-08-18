import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ChangePasswordForm } from '@/components/ChangePasswordForm'
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bell, ChevronRight } from 'lucide-react'

export default function ProfilePage() {
  const { user, logout, isLoading, loadUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    void (async () => {
      try {
        await logout()
        void navigate('/login')
      } catch (err: unknown) {
        console.error('Logout error:', err)
      }
    })()
  }, [logout, navigate])

  const handleAccountDeleted = useCallback(() => {
    void (async () => {
      try {
        await logout()
        void navigate('/login')
      } catch (err: unknown) {
        console.error('Logout error:', err)
      }
    })()
  }, [logout, navigate])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-xl border">
          <h1 className="text-3xl font-bold text-center text-card-foreground">User Profile</h1>
          <div className="flex justify-center pb-4">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
          <div className="space-y-4 text-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Name:</span>
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Email:</span>
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold">You are not logged in.</h1>
          <p className="text-muted-foreground">Please log in to view your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-xl border">
        <h1 className="text-3xl font-bold text-center text-card-foreground">User Profile</h1>

        {/* Avatar Section */}
        <div className="flex justify-center pb-4">
          <UserAvatar size="xl" showUploadControls={true} />
        </div>

        <div className="space-y-4 text-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-muted-foreground">Name:</span>
            <span className="font-semibold text-card-foreground">{user.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-muted-foreground">Email:</span>
            <span className="font-semibold text-card-foreground">{user.email}</span>
          </div>
        </div>
        <div className="space-y-4 pt-4">
          <ChangePasswordForm />

          {/* Notifications Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-card-foreground">Notifications</h3>
            <Link
              to="/account/notifications"
              className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Notification Preferences</p>
                  <p className="text-sm text-muted-foreground">
                    Manage email and in-app notification settings
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          <Button
            onClick={handleLogout}
            className="my-4 border-gray-200 dark:border-gray-700"
            variant="destructive"
          >
            Logout
          </Button>

          <hr className="my-4 border-gray-200 dark:border-gray-700" />
          <DeleteAccountDialog onAccountDeleted={handleAccountDeleted} />
        </div>
      </div>
    </div>
  )
}
