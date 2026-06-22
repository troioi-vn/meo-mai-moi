import React from 'react'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConnectionLostState } from '@/components/ui/ConnectionLostState'

interface RouteErrorBoundaryProps {
  children: React.ReactNode
}

interface RouteErrorBoundaryState {
  error: Error | null
}

function isChunkLoadError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  )
}

function isOfflineOrNetworkError(error: Error): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    isChunkLoadError(error)
  )
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }

    if (isOfflineOrNetworkError(error)) {
      return <ConnectionLostState />
    }

    return (
      <ErrorState
        error={error.message || 'Something went wrong'}
        onRetry={() => {
          this.setState({ error: null })
          window.location.reload()
        }}
        retryText="Reload"
      />
    )
  }
}
