import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { Ban } from 'lucide-react'

export function BannedReadOnlyBanner() {
  const { user } = useAuth()

  if (!user?.is_banned) return null

  return (
    <div className="container px-3 sm:px-4 pt-3">
      <Alert variant="warning">
        <Ban className="h-4 w-4" />
        <AlertTitle>Read-only mode</AlertTitle>
        <AlertDescription>
          Your account has been banned. You can browse, but any changes (posting, editing,
          messaging) are disabled.
          {user.ban_reason ? ` Reason: ${user.ban_reason}` : ''}
        </AlertDescription>
      </Alert>
    </div>
  )
}
