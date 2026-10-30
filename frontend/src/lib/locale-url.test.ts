import { describe, it, expect } from 'vite-plus/test'
import { localeFromPath, routerBasename, localizedPath } from './locale-url'

describe('localeFromPath', () => {
  it('reads a supported locale off the first segment', () => {
    expect(localeFromPath('/vi/requests/3')).toBe('vi')
    expect(localeFromPath('/uk')).toBe('uk')
    expect(localeFromPath('/ru/helpers')).toBe('ru')
  })

  it('returns null for an unprefixed path', () => {
    expect(localeFromPath('/requests/3')).toBeNull()
    expect(localeFromPath('/')).toBeNull()
    expect(localeFromPath('')).toBeNull()
  })

  it('returns null for the default locale, which has no prefix', () => {
    // /en/... is a redirect on the backend, not a page. Treating it as a locale
    // here would hand the router a basename for a URL it never sees.
    expect(localeFromPath('/en/requests/3')).toBeNull()
  })

  it('does not mistake a route for a locale', () => {
    // The guard that matters: these are real first segments in the app.
    expect(localeFromPath('/helpers')).toBeNull()
    expect(localeFromPath('/pets/4/view')).toBeNull()
    expect(localeFromPath('/settings')).toBeNull()
  })
})

describe('routerBasename', () => {
  it('is the prefix for a localised URL', () => {
    expect(routerBasename('/vi/requests/3')).toBe('/vi')
  })

  it('is undefined when there is no prefix to absorb', () => {
    expect(routerBasename('/requests/3')).toBeUndefined()
  })
})

describe('localizedPath', () => {
  it('moves between languages without accumulating prefixes', () => {
    expect(localizedPath('/vi/requests/3', 'uk')).toBe('/uk/requests/3')
    expect(localizedPath('/vi/requests/3', 'en')).toBe('/requests/3')
    expect(localizedPath('/requests/3', 'vi')).toBe('/vi/requests/3')
    expect(localizedPath('/vi/settings', 'ru')).toBe('/ru/settings')
  })
  it('keeps landing URLs canonical', () => {
    expect(localizedPath('/', 'vi')).toBe('/vi')
    expect(localizedPath('/vi', 'en')).toBe('/')
    expect(localizedPath('/vi', 'uk')).toBe('/uk')
  })
})
