import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PetAvatar } from '@/components/habits/PetAvatar'
import { saveListScrollPosition } from '@/lib/scroll-restoration'
import type { LitterGroup } from './litterGrouping'

interface LitterCardProps {
  group: LitterGroup
}

export function LitterCard({ group }: LitterCardProps) {
  const { t } = useTranslation('pets')
  const location = useLocation()
  const litterRoute = `/litters/${String(group.litterId)}`
  const visibleCount = group.members.length

  const handleEnterDetail = () => {
    saveListScrollPosition(location.pathname)
  }

  // Show up to 4 avatars, overlapping
  const avatars = group.members.slice(0, 4)
  const remaining = visibleCount - avatars.length

  return (
    <Card
      className="flex flex-col overflow-hidden rounded-lg pt-0 shadow-sm transition-shadow duration-200 hover:shadow-lg"
      data-testid={`litter-card-${String(group.litterId)}`}
    >
      <Link
        to={litterRoute}
        className="block"
        aria-label={group.litterName}
        onClick={handleEnterDetail}
        data-testid={`litter-card-link-${String(group.litterId)}`}
      >
        <div className="aspect-square w-full bg-muted flex items-center justify-center p-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {avatars.map((pet) => (
              <PetAvatar
                key={pet.id}
                name={pet.name}
                photoUrl={pet.photo_url ?? (pet.photos?.[0]?.url as string | null) ?? null}
              />
            ))}
            {remaining > 0 && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                +{remaining}
              </span>
            )}
          </div>
        </div>
      </Link>

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <Link
            to={litterRoute}
            className="text-primary hover:underline leading-tight"
            onClick={handleEnterDetail}
          >
            {group.litterName}
          </Link>
        </CardTitle>
        <CardDescription>
          {t('pets:litter.card.membersCount', { count: visibleCount })}
        </CardDescription>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {group.members.slice(0, 6).map((pet) => (
            <span
              key={pet.id}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              data-testid={`litter-member-name-${String(pet.id)}`}
            >
              {pet.name}
            </span>
          ))}
          {visibleCount > 6 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +{visibleCount - 6}
            </span>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}
