import { MapPin } from 'lucide-react'
import placeholderAvatar from '@/assets/images/default-avatar.webp'
import type { HelperProfile } from '@/types/helper-profile'
import { HelperProfileStatusBadge } from './HelperProfileStatusBadge'

interface Photo {
  id: number
  path: string
  url?: string
}

const getLocation = (profile: HelperProfile) => {
  const cityNames =
    profile.cities && profile.cities.length > 0
      ? profile.cities.map((c) => c.name).join(', ')
      : typeof profile.city === 'string'
        ? profile.city
        : profile.city?.name

  const locationParts = [cityNames, profile.state, profile.country].filter(Boolean)
  return locationParts.join(', ') || 'Location not specified'
}

const getAvatarUrl = (profile: HelperProfile) => {
  const photos = (profile.photos as Photo[] | undefined) ?? []
  const firstPhoto = photos[0]
  return firstPhoto ? (firstPhoto.url ?? `/storage/${firstPhoto.path}`) : placeholderAvatar
}

export function HelperProfileSummaryHeader({ profile }: { profile: HelperProfile }) {
  const avatarUrl = getAvatarUrl(profile)
  const location = getLocation(profile)

  return (
    <section className="flex items-center gap-4">
      <div className="shrink-0">
        <img
          src={avatarUrl}
          alt={`${profile.user?.name ?? 'Helper'}'s profile`}
          className="w-24 h-24 rounded-full object-cover border-4 border-border"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{profile.user?.name ?? 'Helper'}</h1>
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
