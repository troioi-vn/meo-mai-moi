import { useTranslation } from 'react-i18next'
import { useAuth } from './use-auth'
import { api } from '@/api/axios'
import { localizedPath, localeFromPath, type SupportedLocale } from '@/lib/locale-url'

/** Both switchers persist explicit choices and keep the URL in sync. */
export function useChangeLanguage() {
  const { i18n } = useTranslation()
  const { user } = useAuth()

  return async (locale: SupportedLocale) => {
    localStorage.setItem('i18nextLng', locale)
    if (user) {
      try {
        await api.put('/user/locale', { locale })
      } catch (error) {
        console.error('Failed to save locale preference:', error)
      }
    }

    const { pathname, search, hash } = window.location
    // Public URLs acquire the chosen prefix. A visitor already using a prefix
    // keeps it elsewhere in the SPA too. Other private URLs stay unprefixed.
    const bare = localizedPath(pathname, 'en')
    const isPublic = /^\/(?:requests(?:\/\d+)?|helpers(?:\/\d+)?|pets\/\d+\/view)?\/?$/.test(bare)
    const target = isPublic || localeFromPath(pathname) ? localizedPath(pathname, locale) : pathname
    if (target !== pathname) {
      // basename is set at mount, so changing it requires a full navigation.
      window.location.assign(target + search + hash)
      return
    }
    await i18n.changeLanguage(locale)
  }
}
