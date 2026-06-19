import type { Pet } from '@/types/pet'
import placeholderImage from '@/assets/images/default-avatar.webp'

interface PetPhotoLike {
  url?: string | null
  thumb_url?: string | null
}

export const deriveImageUrl = (pet: Pet): string => {
  const photos = (pet as { photos?: PetPhotoLike[] }).photos
  if (Array.isArray(photos)) {
    const photoUrl = photos[0]?.url
    if (photoUrl) return photoUrl
  }
  return pet.photo_url ?? placeholderImage
}

export const deriveThumbUrl = (pet: Pet): string => {
  const photos = (pet as { photos?: PetPhotoLike[] }).photos
  if (Array.isArray(photos)) {
    const firstPhoto = photos[0]
    const photoUrl = firstPhoto?.thumb_url ?? firstPhoto?.url
    if (photoUrl) return photoUrl
  }

  return pet.photo_url ?? placeholderImage
}
