/**
 * A city arrives either as a plain name or as the related record, depending on
 * which endpoint produced it — and the shape differs again between types:
 * `string | City` on a helper profile, `City | string | null` on a pet, and an
 * inline `{ id, name }` on a placement snapshot.
 *
 * Typed structurally so it accepts all of them without importing the generated
 * model, which is a build artefact rather than source.
 */
export type CityLike = string | { name?: string | null } | null | undefined

/**
 * The city's name, or null when there is no city or the record carries no name.
 *
 * Deliberately does no trimming or empty-string folding: callers already filter
 * falsy values or guard on them, and keeping this dumb means swapping it in
 * cannot change what anything renders.
 */
export function cityName(city: CityLike): string | null {
  if (city === null || city === undefined) return null
  if (typeof city === 'string') return city

  return city.name ?? null
}
