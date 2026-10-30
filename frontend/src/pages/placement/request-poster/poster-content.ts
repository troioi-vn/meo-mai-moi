import type { TFunction } from 'i18next'
import type { PetSnapshot, PlacementRequestDetail } from '@/types/placement'
import { cityName } from '@/lib/city-name'

/**
 * The poster's own copy, kept out of the component so it can be tested without
 * rendering, a QR library or a router.
 */

/** Notes longer than this stop fitting on one page beside a photo and a QR. */
const NOTES_LIMIT = 320

/**
 * The QR points at the listing, never at the poster. Someone scanning a sheet
 * taped to a lamppost wants the page they can act on.
 */
export function requestUrl(id: number): string {
  return `${window.location.origin}/requests/${String(id)}`
}

/**
 * `request_type` is a plain string on the wire (`types/placement.ts`), so an
 * unrecognised value has to land somewhere. It lands on the neutral headline
 * rather than on foster: a poster that says less is better than one that says
 * the wrong thing to everybody who walks past it.
 */
const HEADLINE_KEYS: Record<string, string> = {
  permanent: 'placement:poster.headline.permanent',
  foster_free: 'placement:poster.headline.foster',
  foster_paid: 'placement:poster.headline.foster',
  pet_sitting: 'placement:poster.headline.pet_sitting',
}

export function posterHeadline(
  request: Pick<PlacementRequestDetail, 'request_type' | 'pet'>,
  t: TFunction
): string {
  const key = HEADLINE_KEYS[request.request_type] ?? 'placement:poster.headline.fallback'

  return t(key, { name: request.pet.name })
}

/**
 * "Nha Trang, VN", or whichever half the record has. `city` arrives either as a
 * plain string or as the related record, depending on the endpoint.
 */
export function petLocation(pet: Pick<PetSnapshot, 'city' | 'country'>): string | null {
  const city = cityName(pet.city)
  const parts = [city, pet.country].filter(
    (part): part is string => typeof part === 'string' && part.trim() !== ''
  )

  return parts.length === 0 ? null : parts.map((part) => part.trim()).join(', ')
}

/**
 * The owner's notes, flattened and clipped. Prefers a translation when the
 * viewer is reading in another language and one has already been produced.
 */
export function posterNotes(
  request: Pick<PlacementRequestDetail, 'notes' | 'notes_translation'>
): string | null {
  const translation = request.notes_translation
  const translated = translation?.is_translated === true ? translation.translated : null
  const source = typeof translated === 'string' && translated !== '' ? translated : request.notes

  if (typeof source !== 'string') return null

  const flattened = source.replace(/\s+/g, ' ').trim()

  if (flattened === '') return null

  return flattened.length > NOTES_LIMIT
    ? `${flattened.slice(0, NOTES_LIMIT - 1).trimEnd()}…`
    : flattened
}
