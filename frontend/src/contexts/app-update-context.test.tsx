import { act, render, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vite-plus/test'
import type { ReactNode } from 'react'

interface UpdateToastOptions {
  action?: { onClick?: () => void }
}

const toast = vi.hoisted(() =>
  Object.assign(
    vi.fn((_message: string, _options?: UpdateToastOptions) => 'app-update'),
    {
      dismiss: vi.fn(),
    }
  )
)

vi.mock('sonner', () => ({ toast }))

vi.mock('@/pwa', () => ({
  triggerAppUpdate: vi.fn(),
}))

import { AppUpdateProvider } from '@/contexts/app-update-context'
import { useAppUpdate, useDirtyFormState } from '@/hooks/use-app-update'
import { triggerAppUpdate } from '@/pwa'

function TestWrapper({ children }: { children: ReactNode }) {
  return <AppUpdateProvider>{children}</AppUpdateProvider>
}

function DirtyFormProbe({ isDirty }: { isDirty: boolean }) {
  useDirtyFormState(isDirty)
  return null
}

describe('AppUpdateProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers a pending update without interrupting the current page', async () => {
    const { result } = renderHook(() => useAppUpdate(), { wrapper: TestWrapper })

    act(() => {
      result.current.requestAppUpdate()
    })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })

    expect(triggerAppUpdate).not.toHaveBeenCalled()

    const options = toast.mock.calls[0]?.[1]
    expect(options).toBeDefined()
    act(() => options?.action?.onClick?.())

    expect(triggerAppUpdate).toHaveBeenCalledTimes(1)
  })

  it('keeps the prompt hidden while a form is dirty, then offers the update', async () => {
    const { result, rerender } = renderHook(
      ({ isDirty }) => {
        useDirtyFormState(isDirty)
        return useAppUpdate()
      },
      {
        initialProps: { isDirty: true },
        wrapper: TestWrapper,
      }
    )

    act(() => {
      result.current.requestAppUpdate()
    })

    expect(triggerAppUpdate).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()

    rerender({ isDirty: false })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })

    expect(triggerAppUpdate).not.toHaveBeenCalled()
  })

  it('offers a pending update after the last dirty form unmounts', async () => {
    let requestAppUpdate: (() => void) | null = null

    function Controller() {
      requestAppUpdate = useAppUpdate().requestAppUpdate
      return null
    }

    function Harness({ showDirtyForm }: { showDirtyForm: boolean }) {
      return (
        <AppUpdateProvider>
          <Controller />
          {showDirtyForm ? <DirtyFormProbe isDirty={true} /> : null}
        </AppUpdateProvider>
      )
    }

    const { rerender } = render(<Harness showDirtyForm={true} />)

    act(() => {
      requestAppUpdate?.()
    })

    expect(triggerAppUpdate).not.toHaveBeenCalled()

    rerender(<Harness showDirtyForm={false} />)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })
  })

  it('waits for blocking dialogs to close before offering a pending update', async () => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-slot', 'dialog-overlay')
    document.body.appendChild(overlay)

    const { result } = renderHook(() => useAppUpdate(), { wrapper: TestWrapper })

    act(() => {
      result.current.requestAppUpdate()
    })

    expect(triggerAppUpdate).not.toHaveBeenCalled()

    act(() => {
      overlay.remove()
    })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })
  })
})
