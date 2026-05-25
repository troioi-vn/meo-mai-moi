import { renderWithRouter, screen, waitFor } from '@/testing'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { fireEvent } from '@testing-library/react'
import HabitsPage from './HabitsPage'
import { format } from 'date-fns'
import { useLocation } from 'react-router-dom'

const todayKey = format(new Date(), 'yyyy-MM-dd')
const habitsApi = vi.hoisted(() => ({
  getHeatmapQueryOptions: vi.fn((habitId: number) => ({
    queryKey: [`/habits/${String(habitId)}/heatmap`],
    queryFn: async () => mockHeatmapByHabitId[habitId] ?? [],
  })),
  createHabit: vi.fn(),
}))
const habitsDayApi = vi.hoisted(() => ({
  getHabitDayEntries: vi.fn(),
  putHabitDayEntries: vi.fn(),
}))

function LocationDisplay() {
  const location = useLocation()

  return <div data-testid="location-display">{location.pathname}</div>
}

const defaultMockHabit = {
  id: 1,
  name: 'Yoga / Activities',
  timezone: 'UTC',
  value_type: 'integer_scale',
  scale_min: 1,
  scale_max: 10,
  day_summary_mode: 'average_scored_pets',
  pet_count: 1,
  share_with_coowners: false,
  reminder_enabled: false,
  reminder_time: null,
  reminder_weekdays: [],
  archived_at: null,
  pets: [{ id: 101, name: 'Tets' }],
}
const mockHabit = { ...defaultMockHabit }

const mockHeatmapByHabitId: Record<number, unknown[]> = {
  1: [
    {
      date: todayKey,
      entry_count: 1,
      average_value: 10,
      display_value: 10,
      normalized_intensity: 1,
    },
  ],
}

vi.mock('@/api/habits-day', () => ({
  getHabitDayEntries: habitsDayApi.getHabitDayEntries,
  putHabitDayEntries: habitsDayApi.putHabitDayEntries,
}))

vi.mock('@/api/generated/habits/habits', () => ({
  getGetHabitsQueryKey: () => ['/habits'],
  getGetHabitsHabitHeatmapQueryKey: (habitId: number, params?: unknown) => [
    `/habits/${String(habitId)}/heatmap`,
    params,
  ],
  getGetHabitsHabitHeatmapQueryOptions: habitsApi.getHeatmapQueryOptions,
  useGetHabits: () => ({
    data: [mockHabit],
    isLoading: false,
  }),
  usePostHabits: () => ({
    mutateAsync: habitsApi.createHabit,
    isPending: false,
  }),
}))

vi.mock('@/api/generated/pets/pets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/generated/pets/pets')>()

  return {
    ...actual,
    useGetMyPetsSections: () => ({
      data: {
        owned: [{ id: 101, name: 'Tets', photo_url: null }],
      },
    }),
  }
})

describe('HabitsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockHabit, defaultMockHabit, {
      pets: [{ id: 101, name: 'Tets' }],
    })
    mockHeatmapByHabitId[1] = [
      {
        date: todayKey,
        entry_count: 1,
        average_value: 10,
        display_value: 10,
        normalized_intensity: 1,
      },
    ]
    habitsDayApi.getHabitDayEntries.mockResolvedValue({
      habit: mockHabit,
      date: todayKey,
      entries: [{ pet_id: 101, pet_name: 'Tets', value_int: 10, is_current_pet: true }],
    })
    habitsDayApi.putHabitDayEntries.mockResolvedValue({
      habit: mockHabit,
      date: todayKey,
      entries: [{ pet_id: 101, value_int: 10 }],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the recent activity board and keeps the habit name as a detail link', async () => {
    renderWithRouter(<HabitsPage />, {
      route: '/habits',
    })

    expect(screen.getByRole('heading', { name: 'Habits', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Active habits', level: 2 })).toBeInTheDocument()

    const habitLink = await screen.findByRole('link', { name: 'Yoga / Activities' })
    expect(habitLink).toHaveAttribute('href', '/habits/1')

    expect(await screen.findByText('10')).toBeInTheDocument()
  })

  it('opens the tracking modal when a recent day cell is clicked', async () => {
    const { user } = renderWithRouter(<HabitsPage />, {
      route: '/habits',
    })

    await user.click(await screen.findByRole('button', { name: todayKey }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByText('Tets')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save day' }))

    await waitFor(() => {
      expect(habitsDayApi.putHabitDayEntries).toHaveBeenCalledWith(1, todayKey, {
        entries: [{ pet_id: 101, value_int: 10 }],
      })
    })
  })

  it('shows yes counts for multi-pet yes/no habits', async () => {
    Object.assign(mockHabit, {
      value_type: 'yes_no',
      pet_count: 3,
    })
    mockHeatmapByHabitId[1] = [
      {
        date: todayKey,
        entry_count: 3,
        average_value: 0.67,
        display_value: 2,
        normalized_intensity: 0.67,
      },
    ]

    renderWithRouter(<HabitsPage />, {
      route: '/habits',
    })

    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  it('uses a yes/no switch in the tracking modal and saves unchecked as no entry', async () => {
    Object.assign(mockHabit, {
      value_type: 'yes_no',
      pet_count: 1,
    })
    habitsDayApi.getHabitDayEntries.mockResolvedValue({
      habit: mockHabit,
      date: todayKey,
      entries: [{ pet_id: 101, pet_name: 'Tets', value_int: null, is_current_pet: true }],
    })

    const { user } = renderWithRouter(<HabitsPage />, {
      route: '/habits',
    })

    await user.click(await screen.findByRole('button', { name: todayKey }))

    expect(await screen.findByRole('switch', { name: 'Tets: Yes' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Not set' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save day' }))

    await waitFor(() => {
      expect(habitsDayApi.putHabitDayEntries).toHaveBeenCalledWith(1, todayKey, {
        entries: [{ pet_id: 101, value_int: null }],
      })
    })
  })

  it('asks to save before closing when clicking outside with unsaved scores', async () => {
    Object.assign(mockHabit, {
      value_type: 'yes_no',
      pet_count: 1,
    })
    habitsDayApi.getHabitDayEntries.mockResolvedValue({
      habit: mockHabit,
      date: todayKey,
      entries: [{ pet_id: 101, pet_name: 'Tets', value_int: null, is_current_pet: true }],
    })

    const { user } = renderWithRouter(<HabitsPage />, {
      route: '/habits',
    })

    await user.click(await screen.findByRole('button', { name: todayKey }))
    await user.click(await screen.findByRole('switch', { name: 'Tets: Yes' }))

    const overlay = document.querySelector('[data-slot="dialog-overlay"]')

    expect(overlay).not.toBeNull()

    fireEvent.pointerDown(overlay!)

    expect(await screen.findByText('Save scores before closing?')).toBeInTheDocument()
    expect(habitsDayApi.putHabitDayEntries).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Save and close' }))

    await waitFor(() => {
      expect(habitsDayApi.putHabitDayEntries).toHaveBeenCalledWith(1, todayKey, {
        entries: [{ pet_id: 101, value_int: 1 }],
      })
    })
  })

  it('disables recent day tracking when a habit has no current pets', async () => {
    Object.assign(mockHabit, {
      pet_count: 0,
      pets: [],
    })

    const { user } = renderWithRouter(<HabitsPage />, {
      route: '/habits',
    })

    const todayButton = await screen.findByRole('button', { name: todayKey })

    expect(todayButton).toBeDisabled()
    await user.click(todayButton)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(habitsDayApi.getHabitDayEntries).not.toHaveBeenCalled()
  })

  it('requests recent heatmap data using each habit timezone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T01:00:00Z'))
    Object.assign(mockHabit, {
      timezone: 'America/Los_Angeles',
    })

    renderWithRouter(<HabitsPage />, {
      route: '/habits',
    })

    expect(habitsApi.getHeatmapQueryOptions).toHaveBeenCalledWith(
      1,
      { end_date: '2026-04-09', weeks: 1 },
      { query: { enabled: true } }
    )
  })

  it('submits the selected timezone when creating a habit', async () => {
    habitsApi.createHabit.mockResolvedValue({
      ...mockHabit,
      id: 77,
      name: 'Dinner meds',
      value_type: 'integer_scale',
      scale_min: 1,
      scale_max: 5,
    })

    const { user } = renderWithRouter(<HabitsPage />, {
      route: '/habits',
      routes: [
        {
          path: '/habits',
          element: (
            <>
              <HabitsPage />
              <LocationDisplay />
            </>
          ),
        },
        {
          path: '/habits/:id',
          element: <LocationDisplay />,
        },
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Add Habit' }))
    await user.type(await screen.findByLabelText('Habit name'), 'Dinner meds')

    expect(screen.getByText('Tracking type')).toBeInTheDocument()

    const selects = screen.getAllByRole('combobox')
    const timezoneSelect = selects.at(0)
    const typeSelect = selects.at(1)

    if (!timezoneSelect || !typeSelect) {
      throw new Error('Expected timezone and tracking type selects in the create dialog.')
    }

    await user.click(typeSelect)
    await user.click(await screen.findByRole('option', { name: 'Numeric scale' }))

    await user.click(timezoneSelect)
    await user.click(await screen.findByRole('option', { name: 'GMT +7' }))

    await user.clear(screen.getByLabelText('Minimum'))
    await user.type(screen.getByLabelText('Minimum'), '1')
    await user.clear(screen.getByLabelText('Maximum'))
    await user.type(screen.getByLabelText('Maximum'), '5')

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('checkbox', { name: 'Tets' }))
    await user.click(screen.getByRole('button', { name: 'Create habit' }))

    await waitFor(() => {
      expect(habitsApi.createHabit).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Dinner meds',
          timezone: 'Etc/GMT-7',
          value_type: 'integer_scale',
          scale_min: 1,
          scale_max: 5,
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/habits/77')
    })
  })
})
