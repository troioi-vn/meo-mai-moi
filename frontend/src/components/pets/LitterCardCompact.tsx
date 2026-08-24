import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PetAvatar } from '@/components/habits/PetAvatar'
import { cn } from '@/lib/utils'
import { saveListScrollPosition } from '@/lib/scroll-restoration'
import type { LitterGroup } from './litterGrouping'

interface LitterCardCompactProps {
  group: LitterGroup
}

export function LitterCardCompact({ group }: LitterCardCompactProps) {
  const { t } = useTranslation('pets')
  const navigate = useNavigate()
  const location = useLocation()
  const litterRoute = `/litters/${String(group.litterId)}`
  const visibleCount = group.members.length
  const avatars = group.members.slice(0, 3)
  const remaining = visibleCount - avatars.length

  const handleClick = () => {
    saveListScrollPosition(location.pathname)
    void navigate(litterRoute)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    handleClick()
  }

  return (
    <div
      className={cn(
        'group cursor-pointer overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md'
      )}
      data-testid={`litter-card-compact-${String(group.litterId)}`}
      role="button"
      tabIndex={0}
      aria-label={group.litterName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-litter-id={group.litterId}
    >
      <div className="relative aspect-square overflow-hidden bg-muted flex items-center justify-center p-2">
        <div className="flex flex-wrap items-center justify-center gap-1">
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
      <div className="px-1.5 pt-1 pb-1.5">
        <p className="truncate text-xs font-semibold text-foreground leading-tight">
          {group.litterName}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight truncate">
          {t('pets:litter.card.membersCount', { count: visibleCount })}
        </p>
      </div>
    </div>
  )
}
