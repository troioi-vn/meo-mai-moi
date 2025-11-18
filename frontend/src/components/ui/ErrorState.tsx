import React from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  error: string
  onRetry?: () => void
  retryText?: string
  title?: string
  variant?: 'default' | 'minimal'
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  retryText = 'Back to Cats',
  title = 'Error',
  variant = 'default',
}) => {
  if (variant === 'minimal') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm" className="ml-4">
              {retryText}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full space-y-4 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-lg">{title}</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
        {onRetry && (
          <div className="flex justify-center">
            <Button onClick={onRetry} variant="outline">
              {retryText}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
