import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supportedLocales, type SupportedLocale } from '@/i18n'
import { useTelegramLoginHandshake } from '@/hooks/use-telegram-login-handshake'

interface TelegramLoginHandshakeProps {
  configured: boolean
  label: string
  redirectPath: string
}

function resolveLocale(language: string): SupportedLocale {
  const locale = language.split('-')[0] as SupportedLocale
  return supportedLocales.includes(locale) ? locale : 'en'
}

export function TelegramLoginHandshake({
  configured,
  label,
  redirectPath,
}: TelegramLoginHandshakeProps) {
  const { t, i18n } = useTranslation(['auth', 'common'])
  const { status, userCode, start } = useTelegramLoginHandshake({
    locale: resolveLocale(i18n.resolvedLanguage ?? i18n.language),
    redirectPath,
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
            : t('auth:telegramHandshake.waiting')}
        </p>
        {userCode && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t('auth:telegramHandshake.codeLabel')}
            </p>
            <p
              className="mt-1 pl-[0.28em] font-mono text-4xl font-black tracking-[0.28em] text-primary sm:text-5xl"
              data-testid="telegram-user-code"
            >
              {userCode}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {t('auth:telegramHandshake.checkCode')}
            </p>
          </>
        )}
      </section>
    )
  }

  const message =
    status === 'cancelled'
      ? t('auth:telegramHandshake.cancelled')
      : status === 'expired'
        ? t('auth:telegramHandshake.expired')
        : t('auth:telegramHandshake.error')

  return (
    <div className="space-y-3 rounded-lg border border-border p-4 text-center" role="alert">
      <p className="text-sm text-foreground">{message}</p>
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
