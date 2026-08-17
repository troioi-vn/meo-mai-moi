import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { AllTheProviders } from '@/testing/providers'
import { HabitPetSummaryCard } from './HabitPetSummaryCard'
import type { Habit, HabitPetSummaryReport } from '@/api/generated/model'

const summaryQuery = vi.hoisted(() => ({
  useGetHabitsHabitPetSummary: vi.fn(),
}))

vi.mock('@/api/generated/habits/habits', () => ({
  useGetHabitsHabitPetSummary: summaryQuery.useGetHabitsHabitPetSummary,
}))

// Recharts needs real layout measurements that jsdom does not provide, so the
// numeric branch asserts on the chart being mounted per pet, not on its geometry.
vi.mock('./HabitPetChart', () => ({
  HabitPetChart: ({ series }: { series: { date?: string; value?: number }[] }) => (
    <div data-testid="habit-pet-chart">{series.length}</div>
  ),
}))

const yesNoHabit = {
  id: 1,
  name: 'Tooth brushing',
  value_type: 'yes_no',
  scale_min: null,
  scale_max: null,
} as Habit

const scaleHabit = {
  id: 2,
  name: 'Playtime',
  value_type: 'integer_scale',
  scale_min: 1,
  scale_max: 10,
} as Habit

function mockSummary(report: HabitPetSummaryReport) {
  summaryQuery.useGetHabitsHabitPetSummary.mockReturnValue({
    data: report,
    isLoading: false,
  })
}

function renderCard(habit: Habit) {
  const user = userEvent.setup()
  render(<HabitPetSummaryCard habit={habit} />, { wrapper: AllTheProviders })
  return { user }
}

function rankedNames() {
  return screen.getAllByRole('listitem').map((item) => item.textContent)
}

describe('HabitPetSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('yes/no habits', () => {
    beforeEach(() => {
      mockSummary({
        start_date: '2026-04-02',
        end_date: '2026-04-08',
        pets: [
          { pet_id: 1, pet_name: 'Pet A', days_since_last_yes: 0, series: [] },
          { pet_id: 2, pet_name: 'Pet B', days_since_last_yes: 2, series: [] },
          { pet_id: 3, pet_name: 'Pet C', days_since_last_yes: null, series: [] },
        ],
      })
    })

    it('ranks pets worst first by default', () => {
      renderCard(yesNoHabit)

      const rows = rankedNames()
      expect(rows[0]).toContain('Pet C')
      expect(rows[1]).toContain('Pet B')
      expect(rows[2]).toContain('Pet A')
    })

    it('labels staleness in days since the last yes', () => {
      renderCard(yesNoHabit)

      expect(screen.getByText('today')).toBeInTheDocument()
      expect(screen.getByText('2 days ago')).toBeInTheDocument()
      // A pet with only "no" entries has never been done — not "today".
      expect(screen.getByText('never')).toBeInTheDocument()
    })

    it('reverses the order when switching to best first', async () => {
      const { user } = renderCard(yesNoHabit)

      await user.click(screen.getByRole('button', { name: 'Best first' }))

      const rows = rankedNames()
      expect(rows[0]).toContain('Pet A')
      expect(rows[1]).toContain('Pet B')
      // "never" stays worst, so it lands last rather than first.
      expect(rows[2]).toContain('Pet C')

      expect(localStorage.getItem('habit-pet-summary-sort')).toBe('best')
    })

    it('does not send a range — the last-yes lookback is unbounded', () => {
      renderCard(yesNoHabit)

      expect(summaryQuery.useGetHabitsHabitPetSummary).toHaveBeenCalledWith(
        1,
        undefined,
        expect.anything()
      )
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    })
  })

  describe('integer scale habits', () => {
    beforeEach(() => {
      mockSummary({
        start_date: '2026-04-02',
        end_date: '2026-04-08',
        pets: [
          {
            pet_id: 1,
            pet_name: 'Pet A',
            days_since_last_yes: null,
            series: [
              { date: '2026-04-06', value: 4 },
              { date: '2026-04-08', value: 9 },
            ],
          },
          { pet_id: 2, pet_name: 'Pet B', days_since_last_yes: null, series: [] },
        ],
      })
    })

    it('renders one chart per pet', async () => {
      renderCard(scaleHabit)

      // The chart is lazy-loaded so yes/no habits never pay for Recharts.
      const charts = await screen.findAllByTestId('habit-pet-chart')
      expect(charts).toHaveLength(2)
      expect(charts[0]).toHaveTextContent('2')
      expect(charts[1]).toHaveTextContent('0')
      expect(screen.getByText('Pet A')).toBeInTheDocument()
      expect(screen.getByText('Pet B')).toBeInTheDocument()
    })

    it('refetches with a narrower window when the range changes', async () => {
      const { user } = renderCard(scaleHabit)

      expect(summaryQuery.useGetHabitsHabitPetSummary).toHaveBeenCalledWith(
        2,
        { weeks: 104 },
        expect.anything()
      )

      await user.click(screen.getByRole('tab', { name: '1M' }))

      await waitFor(() => {
        expect(summaryQuery.useGetHabitsHabitPetSummary).toHaveBeenLastCalledWith(
          2,
          { weeks: 5 },
          expect.anything()
        )
      })
      expect(localStorage.getItem('habit-pet-summary-range')).toBe('1m')
    })

    it('shows no ranking controls', () => {
      renderCard(scaleHabit)

      expect(screen.queryByRole('button', { name: 'Worst first' })).not.toBeInTheDocument()
    })
  })
})
