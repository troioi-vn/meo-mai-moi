import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { ChangePasswordForm } from '@/components/ChangePasswordForm'
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog'

export default function ProfilePage() {
  const { user, logout } = useAuth()

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl dark:bg-neutral-800">
        <h1 className="text-3xl font-bold text-center text-neutral-900 dark:text-neutral-100">
          User Profile
        </h1>
        {user && (
          <div className="space-y-4 text-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-neutral-600 dark:text-neutral-300">Name:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                {user.name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-neutral-600 dark:text-neutral-300">Email:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                {user.email}
              </span>
            </div>
          </div>
        )}
        <div className="space-y-4 pt-4">
          <ChangePasswordForm />
          <DeleteAccountDialog onAccountDeleted={logout} />
          <Button onClick={logout} className="w-full" variant="destructive">
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
