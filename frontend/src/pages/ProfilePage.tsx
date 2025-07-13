import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-neutral-50 rounded-lg shadow-lg dark:bg-neutral-800">
        <h1 className="text-2xl font-bold text-center text-neutral-900 dark:text-neutral-100">Profile</h1>
        {user && (
          <div className="space-y-4 text-neutral-700 dark:text-neutral-300">
            <div className="flex justify-between">
              <span className="font-semibold">Name:</span>
              <span>{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Email:</span>
              <span>{user.email}</span>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <ChangePasswordForm />
          <DeleteAccountDialog onAccountDeleted={logout} />
          <Button onClick={logout} className="w-full" variant="outline">Logout</Button>
        </div>
      </div>
    </div>
  );
}
