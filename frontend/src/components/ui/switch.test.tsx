import { render, screen } from '@/testing'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Switch } from './switch'

describe('Switch', () => {
  it('renders an unchecked switch by default', () => {
    render(<Switch />)

    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeInTheDocument()
    expect(switchElement).toHaveAttribute('aria-checked', 'false')
  })

  it('renders a checked switch when checked prop is true', () => {
    render(<Switch checked={true} />)

    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onCheckedChange when clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<Switch onCheckedChange={handleChange} />)

    const switchElement = screen.getByRole('switch')
    await user.click(switchElement)

    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('toggles between checked and unchecked states', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    const { rerender } = render(<Switch checked={false} onCheckedChange={handleChange} />)

    const switchElement = screen.getByRole('switch')

    // Click to check
    await user.click(switchElement)
    expect(handleChange).toHaveBeenCalledWith(true)

    // Rerender with checked state
    rerender(<Switch checked={true} onCheckedChange={handleChange} />)

    // Click to uncheck
    await user.click(screen.getByRole('switch'))
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('can be disabled', () => {
    render(<Switch disabled />)

    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeDisabled()
  })

  it('has correct styling classes', () => {
    render(<Switch />)

    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveClass(
      'peer',
      'inline-flex',
      'data-[size=default]:h-[18.4px]',
      'data-[size=default]:w-[32px]'
    )
  })

  it('supports custom className', () => {
    render(<Switch className="custom-class" />)

    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveClass('custom-class')
  })
})
