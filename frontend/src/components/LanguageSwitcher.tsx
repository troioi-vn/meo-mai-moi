import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { supportedLocales, localeNames, type SupportedLocale } from '@/i18n'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/api/axios'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const { user } = useAuth()

  const normalizeLocale = (lng: string | undefined): SupportedLocale => {
    const base = (lng ?? 'en').toLowerCase().split('-')[0]
    return (supportedLocales.includes(base as SupportedLocale) ? base : 'en') as SupportedLocale
  }

  const changeLanguage = async (locale: SupportedLocale) => {
    // Update i18next language
    await i18n.changeLanguage(locale)

    // If user is authenticated, persist to backend
    if (user) {
      try {
        await api.put('/user/locale', { locale })
      } catch (error) {
        console.error('Failed to save locale preference:', error)
      }
    }
  }

  const currentLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex w-full items-center justify-between gap-2 px-3 sm:w-50"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{localeNames[currentLocale]}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-50">
        {supportedLocales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => void changeLanguage(locale)}
            className={currentLocale === locale ? 'bg-accent font-medium' : ''}
          >
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
