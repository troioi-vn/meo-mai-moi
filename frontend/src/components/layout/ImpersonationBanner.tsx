import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetImpersonationStatus,
  usePostImpersonationLeave,
} from '@/api/generated/impersonation/impersonation'

export function ImpersonationIndicator() {
  const queryClient = useQueryClient()

  const { data: status } = useGetImpersonationStatus({
    query: {
      refetchInterval: 30000, // Check every 30 seconds
    },
  })

  const leaveMutation = usePostImpersonationLeave({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['impersonation-status'] })
        void queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
        toast.success('Impersonation ended')
        // Redirect to admin users list after ending impersonation
        window.location.href = '/admin/users'
      },
      onError: () => {
        toast.error('Failed to end impersonation')
      },
    },
  })

  if (!status?.is_impersonating) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 shadow-sm transition-all hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span role="img" aria-label="impersonating">
          🕵️
        </span>
        <span className="max-w-24 truncate sm:max-w-48 text-yellow-900 dark:text-yellow-100 font-semibold uppercase tracking-tight">
          {status.impersonated_user?.name ?? 'User'}
        </span>
      </div>

      <button
        onClick={() => {
          leaveMutation.mutate()
        }}
        disabled={leaveMutation.isPending}
        className="ml-0.5 rounded-full p-0.5 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors disabled:opacity-50"
        title="Stop impersonating"
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Stop</span>
      </button>
    </div>
  )
}
