import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { PetCard } from '@/components/pets/PetCard'
import { PetCardCompact } from '@/components/pets/PetCardCompact'
import {
  PlusCircle,
  Cat,
  SlidersHorizontal,
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  RotateCcw,
  Grid2x2,
  SquareSquare,
} from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useEffect, useState } from 'react'
import { LoadingState } from '@/components/ui/LoadingState'
import { useGetMyPetsSections } from '@/api/generated/pets/pets'
import type { Pet, PetType } from '@/types/pet'
import { useAuth } from '@/hooks/use-auth'
import { useTranslation } from 'react-i18next'
import { FilterChip, ToggleButton } from '@/components/ui/filter-controls'
import { cn } from '@/lib/utils'
import {
  usePetFilter,
  applyPetFilter,
  applyRelationshipFilter,
  type PetFilterState,
  type SortBy,
  type RelationshipFilter,
} from '@/hooks/use-pet-filter'
import { consumeListScrollPosition } from '@/lib/scroll-restoration'

const RELATIONSHIP_TYPES: RelationshipFilter[] = ['owner', 'foster', 'editor', 'viewer']

export default function MyPetsPage() {
  const { t } = useTranslation('pets')
  const { isAuthenticated, isLoading } = useAuth()
  const {
    data: sectionsData,
    isLoading: loading,
    error: queryError,
  } = useGetMyPetsSections({ query: { enabled: isAuthenticated && !isLoading } })
  const sections = {
    owned: (sectionsData?.owned ?? []) as unknown as Pet[],
    fostering_active: (sectionsData?.fostering_active ?? []) as unknown as Pet[],
    fostering_past: (sectionsData?.fostering_past ?? []) as unknown as Pet[],
    transferred_away: (sectionsData?.transferred_away ?? []) as unknown as Pet[],
  }
  const error = queryError ? t('messages.fetchError') : null
  const [showAll, setShowAll] = useState(false)
  const [filterOpen, setFilterOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('my-pets-filter-open') === 'true'
    } catch {
      return false
    }
  })
  const [compact, setCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem('my-pets-view') === 'compact'
    } catch {
      return false
    }
  })
  const { filter, updateFilter, resetFilter, isActive } = usePetFilter()
  const navigate = useNavigate()

  useEffect(() => {
    try {
      localStorage.setItem('my-pets-filter-open', String(filterOpen))
    } catch {
      // ignore storage errors
    }
  }, [filterOpen])

  useEffect(() => {
    try {
      localStorage.setItem('my-pets-view', compact ? 'compact' : 'expanded')
    } catch {
      // ignore storage errors
    }
  }, [compact])

  useEffect(() => {
    if (loading || !isAuthenticated) return
    const savedY = consumeListScrollPosition('/')
    if (savedY === null) return
    requestAnimationFrame(() => {
      window.scrollTo(0, savedY)
    })
  }, [loading, isAuthenticated])

  if (isLoading) {
    return <LoadingState message={t('messages.loadingAuth')} />
  }

  if (!isAuthenticated) {
    return <LoadingState message={t('messages.loginRequired')} />
  }

  const allPets = [
    ...sections.owned,
    ...sections.fostering_active,
    ...sections.fostering_past,
    ...sections.transferred_away,
  ]
  const totalPetCount = allPets.length

  const uniquePetTypes = Array.from(
    new Map(allPets.map((p) => [p.pet_type_id, p.pet_type])).values()
  ).sort((a, b) => a.display_order - b.display_order)

  const ownedPetsBase = showAll
    ? sections.owned
    : sections.owned.filter((p) => p.status !== 'deceased')

  // Apply relationship filter first (section-level), then type+sort filter
  const filteredOwned = applyPetFilter(
    applyRelationshipFilter(ownedPetsBase, filter, 'owned'),
    filter
  )
  const filteredFosteringActive = applyPetFilter(
    applyRelationshipFilter(sections.fostering_active, filter, 'fostering'),
    filter
  )
  const filteredFosteringPast = applyPetFilter(
    applyRelationshipFilter(sections.fostering_past, filter, 'fostering'),
    filter
  )
  const filteredTransferredAway = applyPetFilter(
    applyRelationshipFilter(sections.transferred_away, filter, 'transferred'),
    filter
  )

  const hasAnyPets = totalPetCount > 0
  const hasVisiblePets =
    filteredOwned.length > 0 ||
    filteredFosteringActive.length > 0 ||
    filteredFosteringPast.length > 0 ||
    filteredTransferredAway.length > 0
  const allFilteredOut = hasAnyPets && !hasVisiblePets

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          {!loading && !error && hasAnyPets && (
            <TooltipProvider>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterOpen((v) => !v)
                      }}
                      className={cn(
                        'relative p-1.5 rounded-md transition-all duration-200 hover:bg-muted',
                        filterOpen || isActive
                          ? 'text-primary bg-primary/10 hover:bg-primary/15'
                          : 'text-muted-foreground'
                      )}
                      aria-label={t('filter.toggle')}
                      aria-expanded={filterOpen}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      {isActive && !filterOpen && (
                        <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{t('filter.toggle')}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        setCompact((v) => !v)
                      }}
                      className="p-1.5 rounded-md text-muted-foreground transition-all duration-200 hover:bg-muted"
                      aria-label={compact ? t('filter.viewExpanded') : t('filter.viewCompact')}
                    >
                      {compact ? (
                        <SquareSquare className="h-4 w-4" />
                      ) : (
                        <Grid2x2 className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{compact ? t('filter.viewExpanded') : t('filter.viewCompact')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </div>
        {hasAnyPets && (
          <Button onClick={() => void navigate('/pets/create')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('addPet')}
          </Button>
        )}
      </div>

      {filterOpen && !loading && !error && (
        <div className="mb-8 animate-in slide-in-from-top-2 fade-in duration-200">
          <PetFilterPanel
            totalPetCount={totalPetCount}
            uniquePetTypes={uniquePetTypes}
            filter={filter}
            updateFilter={updateFilter}
            resetFilter={resetFilter}
            isActive={isActive}
          />
        </div>
      )}

      {loading && <LoadingState message={t('messages.loadingPets')} />}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="space-y-10">
          {filteredOwned.length > 0 && (
            <section>
              <SectionGrid pets={filteredOwned} compact={compact} />
              {sections.owned.some((p) => p.status === 'deceased') && (
                <div className="mt-4 flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="show-all"
                            checked={showAll}
                            onCheckedChange={setShowAll}
                            className="scale-75"
                          />
                          <label htmlFor="show-all" className="text-xs font-medium cursor-pointer">
                            {t('showAll')}
                          </label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('includesDeceased')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </section>
          )}

          {filteredFosteringActive.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t('sections.fostering_active')}</h2>
              <SectionGrid pets={filteredFosteringActive} compact={compact} />
            </section>
          )}

          {filteredFosteringPast.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t('sections.fostering_past')}</h2>
              <SectionGrid pets={filteredFosteringPast} compact={compact} />
            </section>
          )}

          {filteredTransferredAway.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t('sections.transferred_away')}</h2>
              <SectionGrid pets={filteredTransferredAway} compact={compact} />
            </section>
          )}

          {allFilteredOut && (
            <p className="text-center text-muted-foreground py-8">{t('filter.noResults')}</p>
          )}

          {!hasAnyPets && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Cat />
                </EmptyMedia>
                <EmptyTitle>{t('messages.noPetsYetDescription')}</EmptyTitle>
                <EmptyDescription>{t('messages.noPetsYetHint')}</EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => void navigate('/pets/create')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('addFirstPet')}
              </Button>
            </Empty>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

interface PetFilterPanelProps {
  totalPetCount: number
  uniquePetTypes: PetType[]
  filter: PetFilterState
  updateFilter: (updates: Partial<PetFilterState>) => void
  resetFilter: () => void
  isActive: boolean
}

function PetFilterPanel({
  totalPetCount,
  uniquePetTypes,
  filter,
  updateFilter,
  resetFilter,
  isActive,
}: PetFilterPanelProps) {
  const { t } = useTranslation('pets')

  if (totalPetCount <= 1) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        {t('filter.onlyOnePet')}
      </div>
    )
  }

  const togglePetType = (id: number) => {
    const newIds = filter.petTypeIds.includes(id)
      ? filter.petTypeIds.filter((i) => i !== id)
      : [...filter.petTypeIds, id]
    updateFilter({ petTypeIds: newIds })
  }

  const toggleRelationship = (rel: RelationshipFilter) => {
    const newRels = filter.relationships.includes(rel)
      ? filter.relationships.filter((r) => r !== rel)
      : [...filter.relationships, rel]
    updateFilter({ relationships: newRels })
  }

  const hasTypeFilter = uniquePetTypes.length > 1

  return (
    <div className="rounded-xl border bg-card/60 shadow-sm backdrop-blur-sm overflow-hidden">
      {/* Single row on desktop, stacked groups on mobile */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:divide-x sm:divide-border">
        {/* ── Pet type chips ─────────────────────────────────── */}
        {hasTypeFilter && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {t('filter.petType')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {uniquePetTypes.map((pt) => (
                <FilterChip
                  key={pt.id}
                  label={pt.name}
                  active={filter.petTypeIds.includes(pt.id)}
                  onClick={() => {
                    togglePetType(pt.id)
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Relationship chips ─────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {t('filter.relationship')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {RELATIONSHIP_TYPES.map((rel) => (
              <FilterChip
                key={rel}
                label={t(`filter.relationshipTypes.${rel}`)}
                active={filter.relationships.includes(rel)}
                onClick={() => {
                  toggleRelationship(rel)
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Sort by + direction ────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-1">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {t('filter.sortBy')}
          </span>
          <Select
            value={filter.sortBy}
            onValueChange={(v) => {
              updateFilter({ sortBy: v as SortBy })
            }}
          >
            <SelectTrigger className="h-7 w-44 border-0 bg-muted/60 text-sm shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">{t('filter.sortByOptions.created_at')}</SelectItem>
              <SelectItem value="age">{t('filter.sortByOptions.age')}</SelectItem>
              <SelectItem value="name">{t('filter.sortByOptions.name')}</SelectItem>
              <SelectItem value="birthday">{t('filter.sortByOptions.birthday')}</SelectItem>
              <SelectItem value="vaccination_due">
                {t('filter.sortByOptions.vaccination_due')}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Segmented direction toggle */}
          <div className="flex overflow-hidden rounded-md border bg-muted/40">
            <ToggleButton
              icon={<ArrowDownNarrowWide className="h-3.5 w-3.5" />}
              label={t('filter.sortDirection.asc')}
              active={filter.sortDirection === 'asc'}
              onClick={() => {
                updateFilter({ sortDirection: 'asc' })
              }}
            />
            <div className="w-px bg-border" />
            <ToggleButton
              icon={<ArrowDownWideNarrow className="h-3.5 w-3.5" />}
              label={t('filter.sortDirection.desc')}
              active={filter.sortDirection === 'desc'}
              onClick={() => {
                updateFilter({ sortDirection: 'desc' })
              }}
            />
          </div>
        </div>

        {/* ── Reset ─────────────────────────────────────────── */}
        {isActive && (
          <div className="px-3 py-3 sm:self-stretch flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t('filter.reset')}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t('filter.reset')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionGrid({ pets, compact = false }: { pets: Pet[]; compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {pets.map((pet) => (
          <PetCardCompact key={pet.id} pet={pet} />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {pets.map((pet) => (
        <PetCard key={pet.id} pet={pet} showPrivateHealthSummary />
      ))}
    </div>
  )
}

// Legacy component alias for backward compatibility
export const MyCatsPage = MyPetsPage
