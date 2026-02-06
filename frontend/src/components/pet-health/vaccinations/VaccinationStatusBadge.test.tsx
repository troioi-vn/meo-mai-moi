import { render, screen } from '@/testing'
import { describe, it, expect } from 'vitest'
import { VaccinationStatusBadge } from './VaccinationStatusBadge'

describe('VaccinationStatusBadge', () => {
  it('renders "Up to date" for up_to_date status', () => {
    render(<VaccinationStatusBadge status="up_to_date" />)
    expect(screen.getByText('Up to date')).toBeInTheDocument()
  })

  it('renders "Due soon" for due_soon status', () => {
    render(<VaccinationStatusBadge status="due_soon" />)
    expect(screen.getByText('Due soon')).toBeInTheDocument()
  })

  it('renders "Overdue" for overdue status', () => {
    render(<VaccinationStatusBadge status="overdue" />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('renders "No records" for unknown status', () => {
    render(<VaccinationStatusBadge status="unknown" />)
    expect(screen.getByText('No records')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<VaccinationStatusBadge status="up_to_date" className="custom-class" />)
    const badge = screen.getByText('Up to date')
    expect(badge).toHaveClass('custom-class')
  })

  it('applies correct styling for up_to_date status', () => {
    render(<VaccinationStatusBadge status="up_to_date" />)
    const badge = screen.getByText('Up to date')
    expect(badge).toHaveClass('bg-green-100')
    expect(badge).toHaveClass('text-green-800')
  })

  it('applies correct styling for overdue status', () => {
    render(<VaccinationStatusBadge status="overdue" />)
    const badge = screen.getByText('Overdue')
    expect(badge).toHaveClass('bg-red-100')
    expect(badge).toHaveClass('text-red-800')
  })
})
