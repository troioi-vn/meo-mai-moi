import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Cat, Heart, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PetCard } from '@/components/pets/PetCard'
import { getPetsPlacementRequests } from '@/api/generated/pets/pets'
import type { Pet } from '@/types/pet'
import { LoadingState } from '@/components/ui/LoadingState'

const RECENT_PETS_COUNT = 4

const LandingPage = () => {
  const { t } = useTranslation('common')
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentRequests = async () => {
      try {
        const data = (await getPetsPlacementRequests()) as unknown as Pet[]
        // Sort by latest placement request created_at, take first N
        const sorted = [...data].sort((a, b) => {
          const aTime = Math.max(
            ...(a.placement_requests?.map((pr) =>
              pr.created_at ? new Date(pr.created_at).getTime() : 0
            ) ?? [0])
          )
          const bTime = Math.max(
            ...(b.placement_requests?.map((pr) =>
              pr.created_at ? new Date(pr.created_at).getTime() : 0
            ) ?? [0])
          )
          return bTime - aTime
        })
        setPets(sorted.slice(0, RECENT_PETS_COUNT))
      } catch {
        // Silently fail — the section just won't show
      } finally {
        setLoading(false)
      }
    }

    void fetchRecentRequests()
  }, [])

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-3xl border bg-card/70 p-6 md:p-10">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-2xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  {t('landing.title')}
                </h1>
                <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                  {t('landing.subtitle')}
                </p>

                <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                  <Button asChild size="lg" className="sm:min-w-44">
                    <Link to="/register">{t('landing.getStarted')}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="sm:min-w-44">
                    <Link to="/login">{t('landing.signIn')}</Link>
                  </Button>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">{t('landing.free')}</p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card size="sm" className="text-left">
                  <CardContent className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Cat className="size-5" />
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{t('landing.flow1')}</p>
                  </CardContent>
                </Card>

                <Card size="sm" className="text-left">
                  <CardContent className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Heart className="size-5" />
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{t('landing.flow2')}</p>
                  </CardContent>
                </Card>

                <Card size="sm" className="text-left">
                  <CardContent className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Home className="size-5" />
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{t('landing.flow3')}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Placement Requests */}
      {loading && (
        <section className="container mx-auto px-4 pb-16">
          <LoadingState message={t('requests.loading')} />
        </section>
      )}

      {!loading && pets.length > 0 && (
        <section className="container mx-auto px-4 pb-16 pt-2">
          <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-left md:text-3xl">
              {t('landing.recentRequests')}
            </h2>
            <Button asChild variant="outline" className="sm:self-end">
              <Link to="/requests">{t('landing.viewAllRequests')}</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
        </section>
      )}

      {/* Tagline */}
      <section className="container mx-auto px-4 pb-12 text-center">
        <p className="text-sm text-muted-foreground italic">{t('landing.tagline')}</p>
      </section>
    </div>
  )
}

export default LandingPage
