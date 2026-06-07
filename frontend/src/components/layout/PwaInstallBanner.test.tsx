import { describe, it, expect, vi } from 'vite-plus/test'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@/testing'
import { PwaInstallBanner } from './PwaInstallBanner'

describe('PwaInstallBanner', () => {
  it('renders the banner with install and dismiss buttons', () => {
    const onInstall = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(<PwaInstallBanner onInstall={onInstall} onClose={onClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.querySelectorAll('button[type="button"]').length).toBeGreaterThanOrEqual(3)
    expect(document.querySelector('button[data-variant="outline"]')).toBeInTheDocument()
    expect(document.querySelector('button[data-variant="default"]')).toBeInTheDocument()
  })

  it('calls onInstall when install button is clicked', () => {
    const onInstall = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(<PwaInstallBanner onInstall={onInstall} onClose={onClose} />)

    // Find the Install button (not the "Not now" button)
    const installButtons = screen.getAllByRole('button')
    const installBtn = installButtons.find(
      (btn) => btn.textContent === 'Install' && btn.getAttribute('data-variant') === 'default'
    )
    expect(installBtn).toBeDefined()
    fireEvent.click(installBtn!)
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when not now button is clicked', () => {
    const onInstall = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(<PwaInstallBanner onInstall={onInstall} onClose={onClose} />)

    const dismissBtn = document.querySelector('button[data-variant="outline"]')
    expect(dismissBtn).toBeInTheDocument()
    fireEvent.click(dismissBtn!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders iOS Safari instructions without calling install prompt', () => {
    const onInstall = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(<PwaInstallBanner installMode="ios-safari" onInstall={onInstall} onClose={onClose} />)

    expect(screen.getByText('Add Meo Mai Moi to Home Screen')).toBeInTheDocument()
    expect(screen.getByText(/Tap Share/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Done'))

    expect(onInstall).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
