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

export function AdminPanelLink() {
  const { data: userData } = useQuery<{ data: UserData }>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const response = await api.get<{ data: UserData }>('/users/me')
      return response.data
    },
  })

  const { data: impersonationStatus } = useQuery<ImpersonationStatus>({
    queryKey: ['impersonation-status'],
    queryFn: async () => {
      const response = await api.get<ImpersonationStatus>('/impersonation/status')
      return response.data
    },
  })

  const canAccessAdmin =
    userData?.data.can_access_admin || impersonationStatus?.impersonator?.can_access_admin

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
