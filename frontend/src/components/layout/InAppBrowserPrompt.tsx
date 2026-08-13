import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { isAppInstalled } from '@/hooks/use-pwa-install'
import { useBrowserHandoff } from '@/hooks/use-browser-handoff'
import { getBrowserEnvironment } from '@/lib/browser-environment'

/**
 * Offered once, when a Telegram login link lands somewhere that cannot keep the app.
 *
 * Deliberately not gated on detecting a webview. Telegram's in-app browser sends a user agent
 * byte-identical to Chrome for Android, so no sniffing — ours or a library's — can recognise
 * it. What we do know for certain is that the user arrived from a Telegram link and is not in
 * an installed app, and that is enough to make both offers worth showing.
 *
 * The session works fine where it is; what it lacks is a home-screen icon, push, and any
 * promise of surviving the host app clearing its data.
 */
export function InAppBrowserPrompt() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const { status, fallbackUrl, openInSystemBrowser, copyLink } = useBrowserHandoff()
  const [open, setOpen] = useState(false)
  const environment = useMemo(() => getBrowserEnvironment(), [])

  useEffect(() => {
    if (!user) return

    const params = new URLSearchParams(window.location.search)
    if (params.get('from') !== 'telegram') return

    // Consume the marker either way, so a refresh or back-navigation cannot re-trigger this.
    params.delete('from')
    const query = params.toString()
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash
    )

    // Already installed: the OS routed us here on purpose, and Telegram is a webview the user
    // picked. Neither wants an escape hatch.
    if (isAppInstalled() || environment.isTelegramMiniApp) return

    setOpen(true)
  }, [environment, user])

  if (!open) return null

  const installHint = environment.isIOS ? t('pwa.inApp.installIos') : t('pwa.inApp.installAndroid')

  // Only claim they are inside Telegram when something actually said so; otherwise stay
  // neutral rather than telling a Chrome user they are somewhere they are not.
  const title = environment.isInAppBrowser ? t('pwa.inApp.title') : t('pwa.inApp.titleNeutral')
  const description = environment.isInAppBrowser
    ? t('pwa.inApp.description')
    : t('pwa.inApp.descriptionNeutral')

  return (
    <Dialog open onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            type="button"
            className="w-full"
            disabled={status === 'pending'}
            onClick={() => void openInSystemBrowser()}
          >
            <ExternalLink className="h-4 w-4" />
            {t('pwa.inApp.openInBrowser')}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={status === 'pending'}
            onClick={() => void copyLink()}
          >
            {status === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {status === 'copied' ? t('pwa.inApp.copied') : t('pwa.inApp.copyLink')}
          </Button>

          {fallbackUrl && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('pwa.inApp.pasteHint')}</p>
              <Input
                readOnly
                value={fallbackUrl}
                onFocus={(event) => {
                  event.target.select()
                }}
              />
            </div>
          )}

          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{installHint}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
          }}
        >
          {t('pwa.notNow')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
