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
import { useChangeLanguage } from '@/hooks/useChangeLanguage'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const changeLanguage = useChangeLanguage()

  const normalizeLocale = (lng: string | undefined): SupportedLocale => {
    const base = (lng ?? 'en').toLowerCase().split('-')[0]
    return (supportedLocales.includes(base as SupportedLocale) ? base : 'en') as SupportedLocale
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
