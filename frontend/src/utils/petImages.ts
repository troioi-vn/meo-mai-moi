import type { Pet } from '@/types/pet'
import placeholderImage from '@/assets/images/default-avatar.webp'

export const deriveImageUrl = (pet: Pet): string => {
  const photos = (pet as { photos?: { url?: string }[] }).photos
  if (Array.isArray(photos)) {
    const photoUrl = photos[0]?.url
    if (photoUrl) return photoUrl
  }
  return pet.photo_url ?? placeholderImage
}
