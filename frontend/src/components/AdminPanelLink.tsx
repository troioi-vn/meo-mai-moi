import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/axios'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

interface UserData {
  id: number
  name: string
  email: string
  can_access_admin: boolean
  roles: string[]
}

export function AdminPanelLink() {
  const { data: userData } = useQuery<{ data: UserData }>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const response = await api.get<{ data: UserData }>('/users/me')
      return response.data
    },
  })

  if (!userData?.data.can_access_admin) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className="h-8 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
    >
      <a href="/admin" rel="noopener noreferrer">
        <Settings className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">Admin</span>
      </a>
    </Button>
  )
}
