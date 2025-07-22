import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NotificationBell } from './NotificationBell'

describe('NotificationBell', () => {
  it('renders the bell icon', () => {
    render(<NotificationBell />)
    const button = screen.getByRole('button', { name: /open notifications/i })
    expect(button).toBeInTheDocument()
    // Check for the presence of the SVG icon within the button
    expect(button.querySelector('svg')).toBeInTheDocument()
  })
})
