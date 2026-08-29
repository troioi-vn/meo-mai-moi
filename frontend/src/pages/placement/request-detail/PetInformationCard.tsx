import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { PlacementRequestDetail } from '@/types/placement'
import { formatStatus, isTemporaryType } from '@/types/placement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, MapPin, PawPrint } from 'lucide-react'
import { TranslatedTextBlock } from '@/components/translation/TranslatedTextBlock'
import { getStatusBadgeVariant } from './utils'

interface PetInformationCardProps {
  request: PlacementRequestDetail
  petCity?: string | null
  onTranslationPending?: () => void
  /**
   * `hero` is the complete discovery story. `compact` keeps the original
   * thumbnail row for owners and people already involved in the placement.
   */
  variant?: 'compact' | 'hero'
  /** Discovery actions live inside the pet story instead of below it. */
  action?: ReactNode
}

export function PetInformationCard({
  request,
  petCity,
  onTranslationPending,
  variant = 'compact',
  action,
}: PetInformationCardProps) {
  const { t, i18n } = useTranslation(['common', 'placement'])
  const isHero = variant === 'hero'
  const location = [petCity, request.pet.state, request.pet.country].filter(Boolean).join(', ')
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
      dateStyle: 'medium',
    }).format(new Date(value))

  if (isHero) {
    return (
      <Card className="mb-6 gap-0 overflow-hidden py-0" data-testid="pet-information-card">
        <div className="grid lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]">
          <div className="relative min-h-0 bg-muted">
            {request.pet.photo_url ? (
              <img
                src={request.pet.photo_url}
                alt={request.pet.name}
                loading="eager"
                fetchPriority="high"
                className="aspect-[4/3] h-full w-full object-cover lg:aspect-auto lg:min-h-[34rem]"
              />
            ) : (
              <div className="flex aspect-[4/3] h-full w-full items-center justify-center bg-muted lg:aspect-auto lg:min-h-[34rem]">
                <PawPrint className="h-14 w-14 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col px-5 py-6 sm:px-7 sm:py-8 lg:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t(`placement:requestTypes.${request.request_type}`, {
                  defaultValue: request.request_type,
                })}
              </span>
              <Badge variant={getStatusBadgeVariant(request.status)}>
                {t(`placement:status.${request.status}`, {
                  defaultValue: formatStatus(request.status),
                })}
              </Badge>
            </div>

            <h1 className="mt-4 font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl">
              {request.pet.name}
            </h1>

            <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {request.pet.pet_type && <p>{request.pet.pet_type.name}</p>}
              {location && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{location}</span>
                </p>
              )}
              {isTemporaryType(request.request_type) &&
                Boolean(request.start_date ?? request.end_date) && (
                  <p className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                      {request.start_date &&
                        t('common:requestDetail.starts', {
                          date: formatDate(request.start_date),
                        })}
                      {request.start_date && request.end_date && ' · '}
                      {request.end_date &&
                        t('common:requestDetail.ends', {
                          date: formatDate(request.end_date),
                        })}
                    </span>
                  </p>
                )}
            </div>

            <Button variant="link" asChild className="mt-2 h-auto self-start px-0 py-1">
              <Link to={`/pets/${String(request.pet.id)}/view`}>
                {t('common:requestDetail.viewProfile')}
              </Link>
            </Button>

            {request.notes && (
              <div className="mt-5 border-t pt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t('common:requestDetail.notes')}
                </p>
                <TranslatedTextBlock
                  text={request.notes}
                  translation={request.notes_translation}
                  onPending={onTranslationPending}
                  className="whitespace-pre-wrap text-[0.9375rem] leading-6 text-foreground/80"
                />
              </div>
            )}
          </div>
        </div>

        {action && <div className="border-t bg-muted/35">{action}</div>}
      </Card>
    )
  }

  return (
    <Card className="mb-6" data-testid="pet-information-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('common:requestDetail.petInformation')}</CardTitle>
      </CardHeader>
      <CardContent>
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
            {location && <p className="text-sm text-muted-foreground">{location}</p>}
            <Button variant="link" asChild className="px-0">
              <Link to={`/pets/${String(request.pet.id)}/view`}>
                {t('common:requestDetail.viewProfile')}
              </Link>
            </Button>
          </div>
        </div>

        {request.notes && (
          <div className="mt-4 rounded-md bg-muted p-3">
            <p className="mb-1 text-sm font-medium">{t('common:requestDetail.notes')}</p>
            <TranslatedTextBlock
              text={request.notes}
              translation={request.notes_translation}
              onPending={onTranslationPending}
              className="whitespace-pre-wrap text-sm text-muted-foreground"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
