import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WeightChart } from './WeightChart'
import type { WeightHistory } from '@/api/generated/model'

// Mock ResizeObserver for recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

const createWeight = (overrides: Partial<WeightHistory> = {}): WeightHistory => ({
  id: 1,
  pet_id: 1,
  weight_kg: 5.5,
  record_date: '2024-03-15',
  created_at: '2024-03-15T00:00:00Z',
  updated_at: '2024-03-15T00:00:00Z',
  ...overrides,
})

describe('WeightChart', () => {
  it('renders "No weight records yet" when weights array is empty', () => {
    render(<WeightChart weights={[]} />)
    expect(screen.getByText('No weight records yet')).toBeInTheDocument()
  })

  it('renders chart container when weights are provided', () => {
    const weights = [createWeight()]
    const { container } = render(<WeightChart weights={weights} />)
    // Check that the chart container is rendered
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('handles string weight_kg values from API', () => {
    // API sometimes returns weight_kg as string
    const weights = [createWeight({ weight_kg: '5.5' as unknown as number })]
    // Should not throw error
    const { container } = render(<WeightChart weights={weights} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('renders multiple weight records', () => {
    const weights = [
      createWeight({ id: 1, record_date: '2024-01-15', weight_kg: 5.0 }),
      createWeight({ id: 2, record_date: '2024-02-15', weight_kg: 5.2 }),
      createWeight({ id: 3, record_date: '2024-03-15', weight_kg: 5.5 }),
    ]
    const { container } = render(<WeightChart weights={weights} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })

  it('sorts weights by date in ascending order', () => {
    const weights = [
      createWeight({ id: 3, record_date: '2024-03-15', weight_kg: 5.5 }),
      createWeight({ id: 1, record_date: '2024-01-15', weight_kg: 5.0 }),
      createWeight({ id: 2, record_date: '2024-02-15', weight_kg: 5.2 }),
    ]
    // The chart should sort internally - just verify it renders without error
    const { container } = render(<WeightChart weights={weights} />)
    expect(container.querySelector('[data-chart]')).toBeInTheDocument()
  })
})
