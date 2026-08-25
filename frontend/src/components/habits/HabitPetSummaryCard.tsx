import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from 'lucide-react'
import { useGetHabitsHabitPetSummary } from '@/api/generated/habits/habits'
import type { Habit, HabitPetSummaryRow } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PetAvatar } from './PetAvatar'
import { RangeToggle, ToggleButton } from '@/components/ui/filter-controls'
import { usePersistedChoice } from '@/hooks/use-persisted-choice'
import { LazyChunkBoundary } from '@/components/shared/LazyChunkBoundary'

const HabitPetChart = lazy(() =>
  import('./HabitPetChart').then((m) => ({ default: m.HabitPetChart }))
)

type SummaryRange = '1m' | '3m' | '6m' | '1y' | 'all'
type SummarySort = 'worst' | 'best'

const RANGE_OPTIONS: { value: SummaryRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
]

/** The backend caps the window at 104 weeks, so "ALL" asks for exactly that. */
const RANGE_WEEKS: Record<SummaryRange, number> = {
  '1m': 5,
  '3m': 13,
  '6m': 26,
  '1y': 52,
  all: 104,
}

const RANGE_STORAGE_KEY = 'habit-pet-summary-range'
const SORT_STORAGE_KEY = 'habit-pet-summary-sort'

function isSummaryRange(value: unknown): value is SummaryRange {
  return value === '1m' || value === '3m' || value === '6m' || value === '1y' || value === 'all'
}

function isSummarySort(value: unknown): value is SummarySort {
  return value === 'worst' || value === 'best'
}

export function HabitPetSummaryCard({ habit }: { habit: Habit }) {
  const { t } = useTranslation(['habits', 'common'])
  const habitId = habit.id ?? 0
  const isYesNo = habit.value_type !== 'integer_scale'

  const [range, setRange] = usePersistedChoice(RANGE_STORAGE_KEY, 'all', isSummaryRange)
  const [sort, setSort] = usePersistedChoice(SORT_STORAGE_KEY, 'worst', isSummarySort)

  // Yes/no ranking uses an unbounded lookback, so the range never applies to it.
  const summaryQuery = useGetHabitsHabitPetSummary(
    habitId,
    isYesNo ? undefined : { weeks: RANGE_WEEKS[range] },
    { query: { enabled: habitId > 0 } }
  )
  const pets = useMemo(() => summaryQuery.data?.pets ?? [], [summaryQuery.data])

  const rankedPets = useMemo(() => {
    // A pet that has never been marked yes is the worst case, not the best —
    // sort it as if it were infinitely stale rather than letting null read as 0.
    const staleness = (row: HabitPetSummaryRow) => row.days_since_last_yes ?? Infinity
    const direction = sort === 'worst' ? -1 : 1

    return [...pets].sort((a, b) => {
      const diff = staleness(a) - staleness(b)
      if (diff !== 0) return diff * direction
      return (a.pet_name ?? '').localeCompare(b.pet_name ?? '')
    })
  }, [pets, sort])

  const formatStaleness = (days: number | null | undefined) => {
    if (days === null || days === undefined) return t('byPet.never')
    if (days === 0) return t('byPet.today')
    if (days === 1) return t('byPet.yesterday')
    return t('byPet.daysAgo', { count: days })
  }

  const body = () => {
    if (summaryQuery.isLoading) {
      return <p className="text-sm text-muted-foreground">{t('common:messages.loading')}</p>
    }

    if (pets.length === 0) {
      return <p className="text-sm text-muted-foreground">{t('noCurrentPets')}</p>
    }

    if (isYesNo) {
      return (
        <>
          <div className="flex overflow-hidden rounded-md border bg-muted/40 w-fit">
            <ToggleButton
              icon={<ArrowDownWideNarrow className="h-3.5 w-3.5" />}
              label={t('byPet.sortWorstFirst')}
              active={sort === 'worst'}
              onClick={() => {
                setSort('worst')
              }}
            />
            <div className="w-px bg-border" />
            <ToggleButton
              icon={<ArrowDownNarrowWide className="h-3.5 w-3.5" />}
              label={t('byPet.sortBestFirst')}
              active={sort === 'best'}
              onClick={() => {
                setSort('best')
              }}
            />
          </div>

          <ol className="divide-y rounded-lg border">
            {rankedPets.map((row, index) => (
              <li key={row.pet_id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-4 shrink-0 text-sm tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <PetAvatar name={row.pet_name} photoUrl={row.pet_photo_url} />
                <span className="min-w-0 flex-1 truncate font-medium">{row.pet_name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {formatStaleness(row.days_since_last_yes)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )
    }

    return (
      <>
        <RangeToggle
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
          label={t('byPet.rangeLabel')}
        />

        <div className="space-y-4">
          {pets.map((row) => (
            <div key={row.pet_id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <PetAvatar name={row.pet_name} photoUrl={row.pet_photo_url} />
                <span className="min-w-0 truncate font-medium">{row.pet_name}</span>
              </div>
              <LazyChunkBoundary
                fallback={
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t('common:status.chartUnavailable')}
                  </p>
                }
              >
                <Suspense fallback={<div className="h-40 w-full animate-pulse rounded bg-muted" />}>
                  <HabitPetChart
                    series={row.series ?? []}
                    scaleMin={habit.scale_min ?? 0}
                    scaleMax={habit.scale_max ?? 10}
                    emptyLabel={t('byPet.noData')}
                  />
                </Suspense>
              </LazyChunkBoundary>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('byPet.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{body()}</CardContent>
    </Card>
  )
}
