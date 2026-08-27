import React from 'react'
import { reportError } from '@/lib/error-reporter'

interface LazyChunkBoundaryProps {
  children: React.ReactNode
  /** Rendered in place of the children when their chunk cannot be loaded. */
  fallback: React.ReactNode
}

interface LazyChunkBoundaryState {
  failed: boolean
}

/**
 * Keep a failed lazy import from taking down the route around it.
 *
 * Feature chunks are cached at runtime rather than precached, so a component
 * whose chunk has not been fetched yet cannot load offline. Without this, that
 * rejection reaches `RouteErrorBoundary` and replaces the whole page with
 * "Connection lost" - including the parts that work offline perfectly well.
 *
 * React memoizes a rejected `lazy()` payload, so there is no retry here: the
 * chunk stays unavailable until the document reloads.
 */
export class LazyChunkBoundary extends React.Component<
  LazyChunkBoundaryProps,
  LazyChunkBoundaryState
> {
  constructor(props: LazyChunkBoundaryProps) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError(): LazyChunkBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    try {
      reportError(error, {
        source: 'lazy_chunk_boundary',
        component_stack: errorInfo.componentStack ?? '',
        chunk_load: true,
      })
    } catch {
      // Reporting must never interfere with rendering the fallback.
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
