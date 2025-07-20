import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from '@/test-utils'

import { Alert, AlertTitle, AlertDescription } from './alert'

describe('Alert', () => {
  it('renders correctly with default variant', () => {
    renderWithRouter(<Alert>Default Alert</Alert>)
    const alertElement = screen.getByRole('alert')
    expect(alertElement).toBeInTheDocument()
    expect(alertElement).toHaveTextContent('Default Alert')
    expect(alertElement).toHaveClass('bg-background') // Default variant class
  })

  it('renders correctly with destructive variant', () => {
    renderWithRouter(<Alert variant="destructive">Destructive Alert</Alert>)
    const alertElement = screen.getByRole('alert')
    expect(alertElement).toBeInTheDocument()
    expect(alertElement).toHaveTextContent('Destructive Alert')
    expect(alertElement).toHaveClass('border-destructive/50') // Destructive variant class
  })

  it('renders with a title and description', () => {
    renderWithRouter(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Alert Description</AlertDescription>
      </Alert>
    )

    expect(screen.getByText('Alert Title')).toBeInTheDocument()
    expect(screen.getByText('Alert Description')).toBeInTheDocument()
  })

  it('applies custom class names', () => {
    renderWithRouter(<Alert className="custom-class">Custom Alert</Alert>)
    const alertElement = screen.getByRole('alert')
    expect(alertElement).toHaveClass('custom-class')
  })
})
