import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useNavigate } from 'react-router-dom'
import { PetCard } from '@/components/pets/PetCard'
import { PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('messages.loadingAuth')}</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('messages.loginRequired')}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <Button onClick={() => void navigate('/pets/create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('addPet')}
        </Button>
      </div>

      {loading && <p className="text-muted-foreground">{t('messages.loadingPets')}</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="space-y-10">
          {/* Owned - no header shown */}
          {(() => {
            const ownedPets = showAll
              ? sections.owned
              : sections.owned.filter((p) => p.status !== 'deceased')
            const hasDeceasedPets = sections.owned.some((p) => p.status === 'deceased')
            return (
              ownedPets.length > 0 && (
                <section>
                  <SectionGrid pets={ownedPets} />
                  {/* Filter moved below the pet list - only show if there are deceased pets */}
                  {hasDeceasedPets && (
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
              )
            )
          })()}

          {/* Fostering (Active) */}
          {sections.fostering_active.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-3">{t('sections.fostering_active')}</h2>
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
              <h2 className="text-2xl font-semibold mb-3">{t('sections.transferred_away')}</h2>
              <SectionGrid pets={sections.transferred_away} />
            </section>
          )}

          {/* Show message when no pets at all or no visible pets */}
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
              !hasVisiblePets && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">{t('messages.noPetsYetDescription')}</p>
                  <Button onClick={() => void navigate('/pets/create')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('addFirstPet')}
                  </Button>
                </div>
              )
            )
          })()}
        </div>
      )}
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
