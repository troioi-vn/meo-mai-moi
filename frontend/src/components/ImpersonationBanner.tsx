import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/axios'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface ImpersonationStatus {
  is_impersonating: boolean
  impersonator?: {
    id: number
    name: string
    can_access_admin: boolean
  }
  impersonated_user?: {
    id: number
    name: string
  }
}

export function ImpersonationIndicator() {
  const queryClient = useQueryClient()

  const { data: status } = useQuery<ImpersonationStatus>({
    queryKey: ['impersonation-status'],
    queryFn: async () => {
      const response = await api.get('/impersonation/status')
      return response.data
    },
    refetchInterval: 30000, // Check every 30 seconds
  })

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await api.post('/impersonation/leave')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impersonation-status'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
      toast.success('Impersonation ended')
      // Reload the page to refresh all user-specific data
      window.location.reload()
    },
    onError: () => {
      toast.error('Failed to end impersonation')
    },
  })

  if (!status?.is_impersonating) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-yellow-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium hidden md:inline">
          Impersonating{' '}
          <span className="font-semibold">
            {status.impersonated_user?.name || 'User'}
          </span>
        </span>
        <span className="text-sm font-medium md:hidden">
          {status.impersonated_user?.name || 'User'}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {status.impersonator?.can_access_admin && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <a href="/admin" target="_blank" rel="noopener noreferrer">
              <Settings className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Admin</span>
            </a>
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="h-8 px-2 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50"
        >
          {leaveMutation.isPending ? (
            'Ending...'
          ) : (
            <>
              <X className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Stop</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Keep the old component for backward compatibility but make it empty
export function ImpersonationBanner() {
  return null
}