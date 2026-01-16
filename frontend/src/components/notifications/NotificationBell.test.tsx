import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NotificationBell } from './NotificationBell'
import { MemoryRouter } from 'react-router-dom'

describe('NotificationBell', () => {
  it('renders the bell icon', () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: /open notifications/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/notifications')
    // Check for the presence of the SVG icon within the link
    expect(link.querySelector('svg')).toBeInTheDocument()
  })
})
