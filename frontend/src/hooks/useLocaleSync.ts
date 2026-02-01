import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './useAuth'

/**
 * Hook to sync the user's locale preference from the backend.
 * When a user logs in, their saved locale preference is applied.
 */
export function useLocaleSync() {
  const { i18n } = useTranslation()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const { user } = useAuth()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user?.locale && user.locale !== i18n.language) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      void i18n.changeLanguage(user.locale)
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  }, [user?.locale, i18n])
}
