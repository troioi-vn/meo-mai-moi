import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface LoadingStateProps {
  message?: string
  variant?: 'default' | 'card' | 'list'
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  variant = 'default',
}) => {
  if (variant === 'card') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md space-y-4 p-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-2xl space-y-3 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32 mx-auto" />
        {message && (
          <p className="text-sm text-muted-foreground" data-testid="loading-spinner">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
