import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { act, render, screen, waitFor } from '@testing-library/react'
import { onlineManager } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
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

  it('does not call an online chunk failure a lost connection', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ThrowError error={new Error('Failed to fetch dynamically imported module')} />
        </RouteErrorBoundary>
      </MemoryRouter>
    )

    expect(screen.getByText('App update required')).toBeInTheDocument()
    expect(screen.queryByText('Connection lost')).not.toBeInTheDocument()
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
