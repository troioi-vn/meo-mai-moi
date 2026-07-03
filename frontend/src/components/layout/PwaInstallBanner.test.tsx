import { describe, it, expect, vi } from 'vite-plus/test'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@/testing'
import { PwaInstallBanner } from './PwaInstallBanner'

describe('PwaInstallBanner', () => {
  it('renders iOS Safari instructions with dismiss and done buttons', () => {
    const onClose = vi.fn()

    render(<PwaInstallBanner onClose={onClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Add Meo Mai Moi to Home Screen')).toBeInTheDocument()
    expect(screen.getByText(/Tap Share/)).toBeInTheDocument()
    expect(document.querySelector('button[data-variant="outline"]')).toBeInTheDocument()
    expect(document.querySelector('button[data-variant="default"]')).toBeInTheDocument()
  })

  it('calls onClose when not now button is clicked', () => {
    const onClose = vi.fn()

    render(<PwaInstallBanner onClose={onClose} />)

    const dismissBtn = document.querySelector('button[data-variant="outline"]')
    expect(dismissBtn).toBeInTheDocument()
    fireEvent.click(dismissBtn!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders iOS in-app instructions', () => {
    const onClose = vi.fn()

    render(<PwaInstallBanner installMode="ios-in-app" onClose={onClose} />)

    expect(screen.getByText('Open in Safari to install')).toBeInTheDocument()
    expect(screen.getByText(/This browser cannot add/)).toBeInTheDocument()
  })

  it('calls onClose when done button is clicked', () => {
    const onClose = vi.fn()

    render(<PwaInstallBanner installMode="ios-safari" onClose={onClose} />)

    fireEvent.click(screen.getByText('Done'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
