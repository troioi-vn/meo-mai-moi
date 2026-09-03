import type { QueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'

/**
 * Server payloads are locale-dependent: AI content translations (the
 * `*_translation` blocks) and translatable names are rendered for the
 * `Accept-Language` of the request that fetched them. Query keys carry no
 * locale, so a cached response keeps showing the previous language until
 * something else happens to refetch it.
 *
 * Invalidate the whole cache when the UI language changes so every visible
 * query refetches in the new locale.
 */
export function setupLocaleQueryInvalidation(client: QueryClient): () => void {
  let currentLanguage = i18n.language

  const handleLanguageChanged = (language: string) => {
    if (language === currentLanguage) {
      return
    }

    currentLanguage = language
    void client.invalidateQueries()
  }

  i18n.on('languageChanged', handleLanguageChanged)

  return () => {
    i18n.off('languageChanged', handleLanguageChanged)
  }
}
