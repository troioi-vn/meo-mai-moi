import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/axios'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

interface ImpersonationStatus {
  is_impersonating: boolean
  impersonator?: {
    can_access_admin: boolean
  }
}

interface UserData {
  can_access_admin: boolean
}

export function AdminPanelLink() {
  const { data: userData } = useQuery<UserData>({
    queryKey: ['users', 'me'],
    queryFn: () => api.get<UserData>('/users/me'),
  })

  const { data: impersonationStatus } = useQuery<ImpersonationStatus>({
    queryKey: ['impersonation-status'],
    queryFn: () => api.get<ImpersonationStatus>('/impersonation/status'),
  })

  const canAccessAdmin =
    (userData?.can_access_admin ?? false) ||
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
