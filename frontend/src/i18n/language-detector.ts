import LanguageDetector from 'i18next-browser-languagedetector'
import { localeFromPath } from '@/lib/locale-url'

export const languageDetectionOptions = {
  order: ['localePath', 'localStorage', 'navigator'],
  // A shared URL must not overwrite the visitor's saved preference. Only an
  // explicit choice in a language switcher persists to localStorage.
  caches: [],
  lookupLocalStorage: 'i18nextLng',
}

export function createLanguageDetector() {
  const detector = new LanguageDetector()
  detector.addDetector({
    name: 'localePath',
    lookup: () => localeFromPath(window.location.pathname) ?? undefined,
  })
  return detector
}
