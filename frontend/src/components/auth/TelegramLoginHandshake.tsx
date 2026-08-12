import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supportedLocales, type SupportedLocale } from '@/i18n'
import { useTelegramLoginHandshake } from '@/hooks/use-telegram-login-handshake'

interface TelegramLoginHandshakeProps {
  configured: boolean
  label: string
  redirectPath: string
  invitationCode?: string | null
}

function resolveLocale(language: string): SupportedLocale {
  const locale = language.split('-')[0] as SupportedLocale
  return supportedLocales.includes(locale) ? locale : 'en'
}

export function TelegramLoginHandshake({
  configured,
  label,
  redirectPath,
  invitationCode,
}: TelegramLoginHandshakeProps) {
  const { t, i18n } = useTranslation(['auth', 'common'])
  const { status, deepLink, start } = useTelegramLoginHandshake({
    locale: resolveLocale(i18n.resolvedLanguage ?? i18n.language),
    redirectPath,
    invitationCode,
  })

  if (!configured || status === 'unavailable') return null

  if (status === 'idle' || status === 'starting') {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        data-testid="telegram-login-button"
        aria-label={label}
        disabled={status === 'starting'}
        onClick={() => void start()}
      >
        {status === 'starting' && <Loader2 className="animate-spin" aria-hidden="true" />}
        {status === 'starting' ? t('auth:telegramHandshake.starting') : label}
      </Button>
    )
  }

  if (status === 'waiting' || status === 'approved') {
    return (
      <section
        className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-center shadow-sm"
        aria-live="polite"
        data-testid="telegram-handshake-waiting"
      >
        <p className="text-sm font-semibold text-foreground">
          {status === 'approved'
            ? t('auth:telegramHandshake.finishing')
            : t('auth:telegramHandshake.checkTelegram')}
        </p>
        {deepLink && (
          <a
            className="mt-3 inline-block text-sm text-primary underline"
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('auth:telegramHandshake.reopen')}
          </a>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4 text-center" role="alert">
      <p className="text-sm text-foreground">{t('auth:telegramHandshake.error')}</p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        data-testid="telegram-login-button"
        aria-label={label}
        onClick={() => void start()}
      >
        {t('auth:telegramHandshake.retry')}
      </Button>
    </div>
  )
}
