import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { HelperProfile } from '@/types/helper-profile'
import { ChevronRight, Heart, Home, MapPin } from 'lucide-react'

export function HelperProfileListItem({ profile }: { profile: HelperProfile }) {
  const { t } = useTranslation('common')
  const cityName = typeof profile.city === 'string' ? profile.city : profile.city?.name
  const locationParts = [cityName, profile.state, profile.country].filter(Boolean)
  const location = locationParts.join(', ') || t('helperProfiles.noLocationSet')

  return (
    <Link
      to={`/helper/${String(profile.id)}`}
      className="block rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground truncate">{location}</span>
            </div>
            {profile.status === 'archived' && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {t('status.archived')}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {profile.request_types?.includes('foster_paid') && (
              <Badge variant="outline" className="text-xs">
                <Home className="h-3 w-3 mr-1" />
                {t('helperProfiles.requestTypes.foster_paid')}
              </Badge>
            )}
            {profile.request_types?.includes('foster_free') && (
              <Badge variant="outline" className="text-xs">
                <Home className="h-3 w-3 mr-1" />
                {t('helperProfiles.requestTypes.foster_free')}
              </Badge>
            )}
            {profile.request_types?.includes('permanent') && (
              <Badge variant="outline" className="text-xs">
                <Heart className="h-3 w-3 mr-1" />
                {t('helperProfiles.requestTypes.permanent')}
              </Badge>
            )}
            {profile.request_types?.includes('pet_sitting') && (
              <Badge variant="outline" className="text-xs">
                <Heart className="h-3 w-3 mr-1" />
                {t('helperProfiles.requestTypes.pet_sitting')}
              </Badge>
            )}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </Link>
  )
}
