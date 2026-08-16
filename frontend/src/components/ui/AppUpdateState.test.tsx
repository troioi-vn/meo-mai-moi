import { describe, expect, it, vi } from 'vite-plus/test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppUpdateState } from './AppUpdateState'

const triggerAppUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/pwa', () => ({
  triggerAppUpdate,
}))

describe('AppUpdateState', () => {
  it('reads as an update prompt rather than an error', () => {
    render(<AppUpdateState />)

    expect(screen.getByText('A new version is available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update now' })).toBeInTheDocument()
  })

  it('applies the pending service worker update instead of a bare reload', async () => {
    const user = userEvent.setup()
    render(<AppUpdateState />)

    await user.click(screen.getByRole('button', { name: 'Update now' }))

    expect(triggerAppUpdate).toHaveBeenCalledOnce()
  })
})
