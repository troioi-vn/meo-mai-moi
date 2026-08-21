import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { PlacementRequestDetail } from '@/types/placement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PawPrint } from 'lucide-react'
import { TranslatedTextBlock } from '@/components/translation/TranslatedTextBlock'

interface PetInformationCardProps {
  request: PlacementRequestDetail
  petCity?: string | null
  onTranslationPending?: () => void
  /**
   * `hero` leads the page for a visitor who came to meet the animal: full-width
   * photo, name below it. `compact` keeps the original thumbnail row for the
   * owner and helper views, where the pet is context rather than the subject.
   */
  variant?: 'compact' | 'hero'
}

export function PetInformationCard({
  request,
  petCity,
  onTranslationPending,
  variant = 'compact',
}: PetInformationCardProps) {
  const { t } = useTranslation('common')
  const isHero = variant === 'hero'

  return (
    <Card className="mb-6" data-testid="pet-information-card">
      {!isHero && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('requestDetail.petInformation')}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={isHero ? 'pt-6' : undefined}>
        {isHero ? (
          <div className="space-y-4">
            {request.pet.photo_url ? (
              <img
                src={request.pet.photo_url}
                alt={request.pet.name}
                // The LCP element in this layout, so it is fetched eagerly.
                loading="eager"
                fetchPriority="high"
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
            ) : (
              // A placeholder rather than nothing, so the layout does not
              // collapse into the text for a pet with no photo.
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted">
                <PawPrint className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">{request.pet.name}</h2>
              {request.pet.pet_type && (
                <p className="text-sm text-muted-foreground">{request.pet.pet_type.name}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {petCity}
                {request.pet.state && `, ${request.pet.state}`}
                {request.pet.country && `, ${request.pet.country}`}
              </p>
              <Button variant="link" asChild className="px-0">
                <Link to={`/pets/${String(request.pet.id)}/view`}>
                  {t('requestDetail.viewProfile')}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {request.pet.photo_url && (
              <img
                src={request.pet.photo_url}
                alt={request.pet.name}
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold">{request.pet.name}</h3>
              {request.pet.pet_type && (
                <p className="text-sm text-muted-foreground">{request.pet.pet_type.name}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {petCity}
                {request.pet.state && `, ${request.pet.state}`}
                {request.pet.country && `, ${request.pet.country}`}
              </p>
              <Button variant="link" asChild>
                <Link to={`/pets/${String(request.pet.id)}/view`}>
                  {t('requestDetail.viewProfile')}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {request.notes && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">{t('requestDetail.notes')}</p>
            <TranslatedTextBlock
              text={request.notes}
              translation={request.notes_translation}
              onPending={onTranslationPending}
              className="text-sm text-muted-foreground whitespace-pre-wrap"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
