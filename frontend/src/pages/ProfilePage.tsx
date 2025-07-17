import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ChangePasswordForm } from '@/components/ChangePasswordForm'
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog'
import { UserAvatar } from '@/components/UserAvatar'

export default function ProfilePage() {
  const { user, logout } = useAuth()

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-xl border">
        <h1 className="text-3xl font-bold text-center text-card-foreground">User Profile</h1>

        {/* Avatar Section */}
        {user && (
          <div className="flex justify-center pb-4">
            <UserAvatar size="xl" showUploadControls={true} />
          </div>
        )}

        {user && (
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
        )}
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
