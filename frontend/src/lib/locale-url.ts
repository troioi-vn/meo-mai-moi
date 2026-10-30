/**
 * The locale a public URL names, and the router basename that follows from it.
 *
 * hreflang needs one URL per language, so the public pages accept an optional
 * leading locale segment: /vi/requests/3 beside /requests/3. The default locale
 * stays unprefixed, which keeps every already-indexed URL unchanged and gives
 * each language exactly one address.
 *
 * Kept free of i18next and react-router so both can depend on it.
 */

/** The unprefixed language. Must match `app.locale` on the backend. */
export const DEFAULT_LOCALE = 'en'

/** Locales that appear as a path segment, i.e. everything but the default. */
export const PREFIXED_LOCALES = ['vi', 'uk', 'ru'] as const

export type PrefixedLocale = (typeof PREFIXED_LOCALES)[number]

const isPrefixed = (segment: string): segment is PrefixedLocale =>
  (PREFIXED_LOCALES as readonly string[]).includes(segment)

/**
 * The locale a pathname names, or null when it names none. A path with no
 * prefix is the default locale's, but this reports null rather than the default
 * so callers can tell "English by choice" from "no choice expressed".
 */
export function localeFromPath(pathname: string): PrefixedLocale | null {
  const segment = pathname.split('/').find(Boolean) ?? ''

  return isPrefixed(segment) ? segment : null
}

/**
 * What to hand react-router as `basename`.
 *
 * With the prefix absorbed here, every route path and every <Link to="/..."> in
 * the app stays written in unprefixed form, and the browser URL keeps the
 * prefix on its own. Undefined for the default locale, which has no prefix.
 */
export function routerBasename(pathname: string): string | undefined {
  const locale = localeFromPath(pathname)

  return locale === null ? undefined : `/${locale}`
}
