import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useNavigate } from 'react-router-dom'
import { PetCard } from '@/components/pets/PetCard'
import { PlusCircle, Cat } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useEffect, useState } from 'react'
import { LoadingState } from '@/components/ui/LoadingState'
import { getMyPetsSections } from '@/api/generated/pets/pets'
import type { Pet } from '@/types/pet'
import { useAuth } from '@/hooks/use-auth'
import { useTranslation } from 'react-i18next'

export default function MyPetsPage() {
  const { t } = useTranslation('pets')
  const [sections, setSections] = useState<{
    owned: Pet[]
    fostering_active: Pet[]
    fostering_past: Pet[]
    transferred_away: Pet[]
  }>({ owned: [], fostering_active: [], fostering_past: [], transferred_away: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true)
        const response = await getMyPetsSections()
        setSections(response)
        setError(null)
      } catch (err: unknown) {
        setError(t('messages.fetchError'))
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && !isLoading) {
      void fetchPets()
    }
  }, [isAuthenticated, isLoading, t])

  if (isLoading) {
    return <LoadingState message={t('messages.loadingAuth')} />
  }

  if (!isAuthenticated) {
    return <LoadingState message={t('messages.loginRequired')} />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {(() => {
        const ownedPets = showAll
          ? sections.owned
          : sections.owned.filter((p) => p.status !== 'deceased')
        const hasVisiblePets =
          ownedPets.length > 0 ||
          sections.fostering_active.length > 0 ||
          sections.fostering_past.length > 0 ||
          sections.transferred_away.length > 0

        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
              {hasVisiblePets && (
                <Button onClick={() => void navigate('/pets/create')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('addPet')}
                </Button>
              )}
            </div>

            {loading && <LoadingState message={t('messages.loadingPets')} />}
            {error && <p className="text-destructive">{error}</p>}

            {!loading && !error && (
              <div className="space-y-10">
                {/* Owned - no header shown */}
                {ownedPets.length > 0 && (
                  <section>
                    <SectionGrid pets={ownedPets} />
                    {/* Filter moved below the pet list - only show if there are deceased pets */}
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
                                <label
                                  htmlFor="show-all"
                                  className="text-xs font-medium cursor-pointer"
                                >
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

                {/* Fostering (Active) */}
                {sections.fostering_active.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-3">
                      {t('sections.fostering_active')}
                    </h2>
                    <SectionGrid pets={sections.fostering_active} />
                  </section>
                )}

                {/* Fostering (Past) */}
                {sections.fostering_past.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-3">{t('sections.fostering_past')}</h2>
                    <SectionGrid pets={sections.fostering_past} />
                  </section>
                )}

                {/* Transferred Away */}
                {sections.transferred_away.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-semibold mb-3">
                      {t('sections.transferred_away')}
                    </h2>
                    <SectionGrid pets={sections.transferred_away} />
                  </section>
                )}

                {/* Show message when no pets at all or no visible pets */}
                {!hasVisiblePets && (
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
          </>
        )
      })()}
    </div>
  )
}

function SectionGrid({ pets }: { pets: Pet[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {pets.map((pet) => (
        <PetCard key={pet.id} pet={pet} />
      ))}
    </div>
  )
}

// Legacy component alias for backward compatibility
export const MyCatsPage = MyPetsPage
