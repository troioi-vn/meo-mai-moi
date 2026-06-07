import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, X } from 'lucide-react'
import type { PwaInstallMode } from '@/hooks/use-pwa-install'

interface PwaInstallBannerProps {
  onInstall: () => Promise<void>
  onClose: () => void
  installMode?: PwaInstallMode
}

export function PwaInstallBanner({
  onInstall,
  onClose,
  installMode = 'native',
}: PwaInstallBannerProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = React.useState(true)
  const isNativeInstall = installMode === 'native'
  const title =
    installMode === 'ios-in-app'
      ? t('pwa.iosInAppTitle')
      : installMode === 'ios-safari'
        ? t('pwa.iosSafariTitle')
        : t('pwa.installTitle')
  const description =
    installMode === 'ios-in-app'
      ? t('pwa.iosInAppDescription')
      : installMode === 'ios-safari'
        ? t('pwa.iosSafariDescription')
        : t('pwa.installDescription')

  const handleInstall = async () => {
    try {
      await onInstall()
      onClose()
      setOpen(false)
    } catch (error) {
      console.error('Failed to install PWA:', error)
      onClose()
      setOpen(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContent className="top-auto bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] translate-y-0 p-4 sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              {t('pwa.notNow')}
            </Button>
          </DialogClose>
          {isNativeInstall ? (
            <Button type="button" size="sm" onClick={() => void handleInstall()}>
              {t('pwa.install')}
            </Button>
          ) : (
            <DialogClose asChild>
              <Button type="button" size="sm">
                {t('pwa.done')}
              </Button>
            </DialogClose>
          )}
        </DialogFooter>

        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-4 right-4"
            aria-label={t('actions.close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
