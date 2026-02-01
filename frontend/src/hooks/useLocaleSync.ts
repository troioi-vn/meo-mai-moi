import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './use-auth'

/**
 * Hook to sync the user's locale preference from the backend.
 * When a user logs in, their saved locale preference is applied.
 */
export function useLocaleSync() {
  const { i18n } = useTranslation()
  const { user } = useAuth()

  useEffect(() => {
    if (user?.locale && user.locale !== i18n.language) {
      void i18n.changeLanguage(user.locale)
    }
  }, [user?.locale, i18n])
}
