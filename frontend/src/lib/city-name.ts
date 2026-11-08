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
 * Deliberately does no trimming and does not fold '' to null. Keeping it dumb
 * is what makes it a drop-in: the falsy values it can return are either
 * filtered by the caller, rendered by React as nothing, or coerced with `?? ''`
 * for a form field. Trimming here would quietly change what pages display.
 */
export function cityName(city: CityLike): string | null {
  if (city === null || city === undefined) return null
  if (typeof city === 'string') return city

  return city.name ?? null
}
