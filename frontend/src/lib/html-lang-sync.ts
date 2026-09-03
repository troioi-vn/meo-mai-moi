import i18n from '@/i18n'

/**
 * `index.html` ships a static `<html lang="en">` and the SPA never updated
 * it, so a user reading the app in Ukrainian was still served `lang="en"`
 * for the whole session (screen-reader pronunciation, crawler language
 * classification). Sync the attribute with the active i18next language.
 */
export function setupHtmlLangSync(): () => void {
  const syncHtmlLang = (language: string) => {
    document.documentElement.lang = language
  }

  syncHtmlLang(i18n.language)
  i18n.on('languageChanged', syncHtmlLang)

  return () => {
    i18n.off('languageChanged', syncHtmlLang)
  }
}
