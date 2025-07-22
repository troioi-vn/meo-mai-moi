import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ChangePasswordForm } from '@/components/ChangePasswordForm'
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect } from 'react'

export default function ProfilePage() {
  const { user, logout, isLoading, loadUser } = useAuth()

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

          <Button
            onClick={() => {
              logout().catch((err: unknown) => {
                console.error('Logout error:', err)
              })
            }}
            className="my-4 border-gray-200 dark:border-gray-700"
            variant="destructive"
          >
            Logout
          </Button>

          <hr className="my-4 border-gray-200 dark:border-gray-700" />
          <DeleteAccountDialog
            onAccountDeleted={() => {
              logout().catch((err: unknown) => {
                console.error('Logout error:', err)
              })
            }}
          />
        </div>
      </div>
    </div>
  )
}
