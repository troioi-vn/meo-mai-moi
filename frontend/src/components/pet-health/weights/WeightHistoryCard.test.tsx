import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { WeightHistoryCard } from './WeightHistoryCard'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock ResizeObserver for recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

const mockWeights = [
  {
    id: 1,
    pet_id: 1,
    weight_kg: 5.0,
    record_date: '2024-01-15',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 2,
    pet_id: 1,
    weight_kg: 5.5,
    record_date: '2024-03-15',
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2024-03-15T00:00:00Z',
  },
]

describe('WeightHistoryCard', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/pets/:petId/weights', () => {
        return HttpResponse.json({
          data: { data: mockWeights, links: {}, meta: {} },
        })
      })
    )
  })

  it('renders loading state initially', () => {
    render(<WeightHistoryCard petId={1} canEdit={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders weight history title', async () => {
    render(<WeightHistoryCard petId={1} canEdit={true} />)
    await waitFor(() => {
      expect(screen.getByText('Weight History')).toBeInTheDocument()
    })
  })

  it('shows add button when canEdit is true', async () => {
    render(<WeightHistoryCard petId={1} canEdit={true} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add new weight entry/i })).toBeInTheDocument()
    })
  })

  it('hides add button when canEdit is false', async () => {
    render(<WeightHistoryCard petId={1} canEdit={false} />)
    await waitFor(() => {
      expect(screen.getByText('Weight History')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /add new weight entry/i })).not.toBeInTheDocument()
  })

  it('shows form when add button is clicked', async () => {
    const user = userEvent.setup()
    render(<WeightHistoryCard petId={1} canEdit={true} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add new weight entry/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /add new weight entry/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('shows empty state when no weights', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/:petId/weights', () => {
        return HttpResponse.json({
          data: { data: [], links: {}, meta: {} },
        })
      })
    )

    render(<WeightHistoryCard petId={1} canEdit={true} />)
    await waitFor(() => {
      expect(screen.getByText('No weight records yet')).toBeInTheDocument()
    })
  })
})
