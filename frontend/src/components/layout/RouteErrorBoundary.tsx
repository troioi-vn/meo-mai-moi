import React from 'react'
import { onlineManager } from '@tanstack/react-query'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConnectionLostState } from '@/components/ui/ConnectionLostState'
import { reportError } from '@/lib/error-reporter'

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

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  private wasOnline = onlineManager.isOnline()
  private unsubscribeOnlineManager?: () => void

  constructor(props: RouteErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  componentDidMount() {
    this.unsubscribeOnlineManager = onlineManager.subscribe(() => {
      const isOnline = onlineManager.isOnline()
      const connectivityChanged = isOnline !== this.wasOnline
      const reconnected = isOnline && !this.wasOnline
      this.wasOnline = isOnline

      if (reconnected && this.state.error) {
        this.setState({ error: null })
      } else if (connectivityChanged && this.state.error) {
        this.forceUpdate()
      }
    })
  }

  componentWillUnmount() {
    this.unsubscribeOnlineManager?.()
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    try {
      reportError(error, {
        source: 'react_error_boundary',
        component_stack: errorInfo.componentStack ?? '',
        chunk_load: isChunkLoadError(error),
      })
    } catch {
      // Reporting must never interfere with rendering the existing fallback.
    }
  }

  render() {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }

    if (!onlineManager.isOnline()) {
      return <ConnectionLostState />
    }

    if (isChunkLoadError(error)) {
      return (
        <ErrorState
          title="App update required"
          error="This app version could not load one of its files. Reload to use the latest version."
          onRetry={() => {
            window.location.reload()
          }}
          retryText="Reload"
        />
      )
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
