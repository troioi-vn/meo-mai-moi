import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UpcomingVaccinationsSection } from './UpcomingVaccinationsSection'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock current date to 2024-06-15
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

const mockVaccinations = [
  {
    id: 1,
    pet_id: 1,
    vaccine_name: 'Rabies',
    administered_at: '2024-01-15',
    due_at: '2025-01-15', // Future
    notes: null,
    reminder_sent_at: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 2,
    pet_id: 1,
    vaccine_name: 'FVRCP',
    administered_at: '2024-03-15',
    due_at: '2024-06-20', // Due soon
    notes: 'Booster shot',
    reminder_sent_at: null,
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2024-03-15T00:00:00Z',
  },
]

describe('UpcomingVaccinationsSection', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/pets/:petId/vaccinations', () => {
        return HttpResponse.json({
          data: { data: mockVaccinations, links: {}, meta: {} },
        })
      })
    )
  })

  it('renders loading state initially', () => {
    render(<UpcomingVaccinationsSection petId={1} canEdit={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders section title', async () => {
    render(<UpcomingVaccinationsSection petId={1} canEdit={true} />)
    await waitFor(() => {
      expect(screen.getByText('Upcoming Vaccinations')).toBeInTheDocument()
    })
  })

  it('displays upcoming vaccinations', async () => {
    render(<UpcomingVaccinationsSection petId={1} canEdit={true} />)
    await waitFor(() => {
      expect(screen.getByText('Rabies')).toBeInTheDocument()
      expect(screen.getByText('FVRCP')).toBeInTheDocument()
    })
  })

  it('shows due dates for vaccinations', async () => {
    render(<UpcomingVaccinationsSection petId={1} canEdit={true} />)
    await waitFor(() => {
      expect(screen.getByText('2025-01-15')).toBeInTheDocument()
      expect(screen.getByText('2024-06-20')).toBeInTheDocument()
    })
  })

  it('shows add button when canEdit is true', async () => {
    render(<UpcomingVaccinationsSection petId={1} canEdit={true} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add new vaccination entry/i })).toBeInTheDocument()
    })
  })

  it('hides add button when canEdit is false', async () => {
    render(<UpcomingVaccinationsSection petId={1} canEdit={false} />)
    await waitFor(() => {
      expect(screen.getByText('Upcoming Vaccinations')).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('button', { name: /add new vaccination entry/i })
    ).not.toBeInTheDocument()
  })

  it('shows form when add button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<UpcomingVaccinationsSection petId={1} canEdit={true} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add new vaccination entry/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /add new vaccination entry/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('shows empty state when no upcoming vaccinations', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/:petId/vaccinations', () => {
        return HttpResponse.json({
          data: { data: [], links: {}, meta: {} },
        })
      })
    )

    render(<UpcomingVaccinationsSection petId={1} canEdit={true} />)
    await waitFor(() => {
      expect(screen.getByText('No upcoming vaccinations scheduled.')).toBeInTheDocument()
    })
  })

  it('calls onVaccinationChange callback when vaccination is added', async () => {
    const onVaccinationChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    server.use(
      http.post('http://localhost:3000/api/pets/:petId/vaccinations', () => {
        return HttpResponse.json({
          data: {
            id: 3,
            pet_id: 1,
            vaccine_name: 'New Vaccine',
            administered_at: '2024-06-15',
            due_at: '2025-06-15',
            notes: null,
          },
        })
      })
    )

    render(
      <UpcomingVaccinationsSection
        petId={1}
        canEdit={true}
        onVaccinationChange={onVaccinationChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add new vaccination entry/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /add new vaccination entry/i }))

    // Fill out form - label is "Vaccine" not "Vaccine name"
    await waitFor(() => {
      expect(screen.getByText('Vaccine')).toBeInTheDocument()
    })

    const vaccineInput = screen.getByPlaceholderText('e.g. Rabies')
    await user.clear(vaccineInput)
    await user.type(vaccineInput, 'New Vaccine')

    // Submit the form
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onVaccinationChange).toHaveBeenCalled()
    })
  })
})
