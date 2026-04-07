import { MapPin } from 'lucide-react'
import placeholderAvatar from '@/assets/images/default-avatar.webp'
import type { HelperProfile } from '@/types/helper-profile'
import { HelperProfileStatusBadge } from './HelperProfileStatusBadge'
import { useTranslation } from 'react-i18next'

interface Photo {
  id: number
  path?: string
  url?: string
  thumb_url?: string | null
}

const getLocation = (profile: HelperProfile, fallback: string) => {
  const cityNames =
    profile.cities && profile.cities.length > 0
      ? profile.cities.map((c) => c.name).join(', ')
      : typeof profile.city === 'string'
        ? profile.city
        : profile.city?.name

  const locationParts = [cityNames, profile.state, profile.country].filter(Boolean)
  return locationParts.join(', ') || fallback
}

const getAvatarUrl = (profile: HelperProfile) => {
  const photos = (profile.photos as Photo[] | undefined) ?? []
  const firstPhoto = photos[0]
  return firstPhoto ? (firstPhoto.url ?? (firstPhoto.path ? `/storage/${firstPhoto.path}` : placeholderAvatar)) : placeholderAvatar
}

export function HelperProfileSummaryHeader({ profile }: { profile: HelperProfile }) {
  const { t } = useTranslation(['helper', 'common'])
  const avatarUrl = getAvatarUrl(profile)
  const helperName = profile.user?.name ?? t('helper:view.helperFallback')
  const location = getLocation(profile, t('common:locationNotSpecified'))

  return (
    <section className="flex items-center gap-4">
      <div className="shrink-0">
        <img
          src={avatarUrl}
          alt={t('helper:view.profilePhotoAlt', { name: helperName })}
          className="w-24 h-24 rounded-full object-cover border-4 border-border"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{helperName}</h1>
          <HelperProfileStatusBadge status={profile.status} />
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{location}</span>
        </div>
      </div>
    </section>
  )
}
