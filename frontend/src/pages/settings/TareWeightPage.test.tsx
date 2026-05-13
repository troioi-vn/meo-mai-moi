import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { screen } from '@testing-library/react'
import TareWeightPage from './TareWeightPage'
import { renderWithRouter } from '@/testing'

const mockUseOwnerWeights = vi.fn()

vi.mock('@/hooks/useOwnerWeights', () => ({
  useOwnerWeights: () => mockUseOwnerWeights(),
}))

vi.mock('@/components/pet-health/weights/WeightChart', () => ({
  WeightChart: () => <div data-testid="weight-chart" />,
}))

describe('TareWeightPage', () => {
  beforeEach(() => {
    mockUseOwnerWeights.mockReturnValue({
      items: [],
      page: 1,
      meta: null,
      links: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    })
  })

  it('renders breadcrumb, title, and chart surface', () => {
    renderWithRouter(<TareWeightPage />, {
      initialEntries: ['/settings/tare-weight'],
      route: '/settings/tare-weight',
      initialAuthState: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
      },
    })

    expect(screen.getAllByText('Tare weight').length).toBeGreaterThan(0)
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^settings$/i })).toHaveAttribute(
      'href',
      '/settings/account'
    )
    expect(screen.queryByRole('link', { name: /back to settings/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('weight-chart')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add tare weight entry/i })).toBeInTheDocument()
  })
})
