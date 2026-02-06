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

interface PwaInstallBannerProps {
  onInstall: () => Promise<void>
  onDismiss: () => void
}

export function PwaInstallBanner({ onInstall, onDismiss }: PwaInstallBannerProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = React.useState(true)

  const handleInstall = async () => {
    try {
      await onInstall()
      setOpen(false)
    } catch (error) {
      console.error('Failed to install PWA:', error)
      onDismiss()
      setOpen(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      onDismiss()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContent className="top-auto bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] translate-y-0 p-4 sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            {t('pwa.installTitle')}
          </DialogTitle>
          <DialogDescription>{t('pwa.installDescription')}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              {t('pwa.notNow')}
            </Button>
          </DialogClose>
          <Button type="button" size="sm" onClick={() => void handleInstall()}>
            {t('pwa.install')}
          </Button>
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
