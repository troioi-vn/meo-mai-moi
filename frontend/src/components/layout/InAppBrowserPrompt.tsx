import { useEffect, useState } from 'react'
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
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { useBrowserHandoff } from '@/hooks/use-browser-handoff'

/**
 * Offered once, when a Telegram login link lands the session in an in-app webview.
 *
 * The session works fine here — what it lacks is a home-screen icon, push, and any promise of
 * surviving the host app clearing its webview data. So this offers a way into a real browser
 * and the install instructions for the platform, rather than treating the webview as broken.
 */
export function InAppBrowserPrompt() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const { installMode } = usePwaInstall(Boolean(user))
  const { status, fallbackUrl, openInSystemBrowser, copyLink } = useBrowserHandoff()
  const [open, setOpen] = useState(false)

  const isInAppBrowser = installMode === 'android-in-app' || installMode === 'ios-in-app'

  useEffect(() => {
    if (!user || !isInAppBrowser) return

    const params = new URLSearchParams(window.location.search)
    if (params.get('from') !== 'telegram') return

    // Consume the marker so a refresh or a back-navigation does not re-open this.
    params.delete('from')
    const query = params.toString()
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash
    )
    setOpen(true)
  }, [isInAppBrowser, user])

  if (!open) return null

  const installHint =
    installMode === 'ios-in-app' ? t('pwa.inApp.installIos') : t('pwa.inApp.installAndroid')

  return (
    <Dialog open onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pwa.inApp.title')}</DialogTitle>
          <DialogDescription>{t('pwa.inApp.description')}</DialogDescription>
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
