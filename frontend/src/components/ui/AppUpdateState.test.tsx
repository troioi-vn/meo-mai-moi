import { describe, expect, it, vi } from 'vite-plus/test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppUpdateState } from './AppUpdateState'

const recoverFromStaleApp = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@/pwa', () => ({
  recoverFromStaleApp,
}))

describe('AppUpdateState', () => {
  it('reads as an update prompt rather than an error', () => {
    render(<AppUpdateState />)

    expect(screen.getByText('A new version is available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update now' })).toBeInTheDocument()
  })

  it('recovers from the stale service worker and prevents repeat taps', async () => {
    const user = userEvent.setup()
    render(<AppUpdateState />)

    await user.click(screen.getByRole('button', { name: 'Update now' }))

    expect(recoverFromStaleApp).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Update now' })).toBeDisabled()
  })
})
