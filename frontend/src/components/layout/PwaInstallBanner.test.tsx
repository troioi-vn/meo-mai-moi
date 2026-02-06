import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@/testing'
import { PwaInstallBanner } from './PwaInstallBanner'

describe('PwaInstallBanner', () => {
  it('renders the banner with install and dismiss buttons', () => {
    const onInstall = vi.fn().mockResolvedValue(undefined)
    const onDismiss = vi.fn()

    render(<PwaInstallBanner onInstall={onInstall} onDismiss={onDismiss} />)

    expect(screen.getByText('Install Meo Mai Moi')).toBeInTheDocument()
    expect(screen.getByText(/Add to your home screen for quick access/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument()
  })

  it('calls onInstall when install button is clicked', () => {
    const onInstall = vi.fn().mockResolvedValue(undefined)
    const onDismiss = vi.fn()

    render(<PwaInstallBanner onInstall={onInstall} onDismiss={onDismiss} />)

    // Find the Install button (not the "Not now" button)
    const installButtons = screen.getAllByRole('button')
    const installBtn = installButtons.find(
      (btn) => btn.textContent === 'Install' && btn.getAttribute('data-variant') === 'default'
    )
    expect(installBtn).toBeDefined()
    fireEvent.click(installBtn!)
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when not now button is clicked', () => {
    const onInstall = vi.fn().mockResolvedValue(undefined)
    const onDismiss = vi.fn()

    render(<PwaInstallBanner onInstall={onInstall} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
