import React from 'react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  error: string
  onRetry?: () => void
  retryText?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  error, 
  onRetry, 
  retryText = 'Back to Cats' 
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-destructive">{error}</h1>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            {retryText}
          </Button>
        )}
      </div>
    </div>
  )
}
