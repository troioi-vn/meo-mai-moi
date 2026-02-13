import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
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

export function LanguageSwitcherCompact() {
  const { i18n } = useTranslation()
  const { user } = useAuth()

  const normalizeLocale = (lng: string | undefined): SupportedLocale => {
    const base = (lng ?? 'en').toLowerCase().split('-')[0]
    return (supportedLocales.includes(base as SupportedLocale) ? base : 'en') as SupportedLocale
  }

  const changeLanguage = async (locale: SupportedLocale) => {
    await i18n.changeLanguage(locale)
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
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11">
          <Globe className="size-5" />
          <span className="sr-only">{currentLocale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
