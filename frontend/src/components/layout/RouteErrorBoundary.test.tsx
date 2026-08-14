import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { act, render, screen, waitFor } from '@testing-library/react'
import { onlineManager } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import { RouteErrorBoundary } from './RouteErrorBoundary'

function ThrowError({ error }: { error: Error }): React.ReactNode {
  throw error
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    onlineManager.setOnline(true)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    onlineManager.setOnline(true)
    vi.restoreAllMocks()
  })

  it('does not call an online chunk failure a lost connection and tags its report', async () => {
    let payload: Record<string, unknown> | undefined
    server.use(
      http.post('http://localhost:3000/api/error-events', async ({ request }) => {
        payload = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { success: true, data: { id: 2, fingerprint: 'chunk-error' } },
          { status: 201 }
        )
      })
    )

    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ThrowError error={new Error('Failed to fetch dynamically imported module')} />
        </RouteErrorBoundary>
      </MemoryRouter>
    )

    expect(screen.getByText('App update required')).toBeInTheDocument()
    expect(screen.queryByText('Connection lost')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(payload).toBeDefined()
    })
    expect(payload).toMatchObject({ context: { chunk_load: 'true' } })
  })

  it('reports a render error with its React component stack and chunk classification', async () => {
    let payload: Record<string, unknown> | undefined
    let reportCount = 0
    server.use(
      http.post('http://localhost:3000/api/error-events', async ({ request }) => {
        reportCount += 1
        payload = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { success: true, data: { id: 2, fingerprint: 'render-error' } },
          { status: 201 }
        )
      })
    )
    window.history.replaceState({}, '', '/render-crash')
    const error = new Error('render boom')
    error.stack = 'Error: render boom\n    at ThrowError (RouteErrorBoundary.test.tsx:1:1)'

    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ThrowError error={error} />
        </RouteErrorBoundary>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(payload).toBeDefined()
    })
    if (!payload) throw new Error('Expected an error report')
    expect(payload).toMatchObject({
      message: 'render boom',
      stack: error.stack,
      route: '/render-crash',
      app_version: import.meta.env.VITE_APP_VERSION,
      context: {
        source: 'react_error_boundary',
        chunk_load: 'false',
      },
    })
    expect((payload.context as Record<string, string>).component_stack).toContain('ThrowError')
    expect(reportCount).toBe(1)
  })

  it('shows an online request failure as a retryable error instead of confirmed offline', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ThrowError error={new Error('Network Error')} />
        </RouteErrorBoundary>
      </MemoryRouter>
    )

    expect(screen.getByText('Network Error')).toBeInTheDocument()
    expect(screen.queryByText('Connection lost')).not.toBeInTheDocument()
  })

  it('automatically retries its children after confirmed reconnection', async () => {
    onlineManager.setOnline(false)
    let shouldThrow = true

    function SometimesThrows() {
      if (shouldThrow) {
        throw new Error('Failed to fetch')
      }

      return <p>Recovered route</p>
    }

    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <SometimesThrows />
        </RouteErrorBoundary>
      </MemoryRouter>
    )

    expect(screen.getByText('Connection lost')).toBeInTheDocument()

    shouldThrow = false
    act(() => {
      onlineManager.setOnline(true)
    })

    await waitFor(() => {
      expect(screen.getByText('Recovered route')).toBeInTheDocument()
    })
  })
})
