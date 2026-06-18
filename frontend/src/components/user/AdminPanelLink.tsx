import { useGetImpersonationStatus } from '@/api/generated/impersonation/impersonation'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export function AdminPanelLink() {
  const { user } = useAuth()

  const { data: impersonationStatus } = useGetImpersonationStatus({
    query: {
      enabled: Boolean(user),
    },
  })

  const canAccessAdmin =
    (user?.can_access_admin ?? false) ||
    (impersonationStatus?.impersonator?.can_access_admin ?? false)

  if (!canAccessAdmin) {
    return null
  }

  return (
    <Button variant="outline" size="sm" asChild className="h-8 px-2 text-xs">
      <a href="/admin" rel="noopener noreferrer">
        <Settings className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">Admin</span>
      </a>
    </Button>
  )
}
