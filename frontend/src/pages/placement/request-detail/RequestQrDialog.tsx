import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { Download, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/lib/i18n-toast'

interface RequestQrDialogProps {
  url: string
  petName: string
}

/**
 * A printable QR code for this placement request, shown only to the owner.
 *
 * The person who wants a QR of a page is the one printing a flyer or taping a
 * card to a carrier, not the adopter already reading it. Until now the app had
 * no way to produce one at all, which made the scan-at-the-rescue journey
 * depend on someone generating it elsewhere.
 */
export function RequestQrDialog({ url, petName }: RequestQrDialogProps) {
  const { t } = useTranslation(['common', 'placement'])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    // The canvas only exists once the dialog has painted.
    const rafId = requestAnimationFrame(() => {
      if (!canvasRef.current) return

      QRCode.toCanvas(canvasRef.current, url, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: 'M',
      }).catch((error: unknown) => {
        console.error('Failed to generate QR code', error)
        toast.error('common:errors.generic')
      })
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isOpen, url])

  const handleDownload = () => {
    if (!canvasRef.current) return

    try {
      const link = document.createElement('a')
      link.download = `${petName.toLowerCase().replace(/\s+/g, '-')}-qr.png`
      link.href = canvasRef.current.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download QR code', error)
      toast.error('common:errors.generic')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t('placement:qr.title', { name: petName })}>
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('placement:qr.title', { name: petName })}</DialogTitle>
          <DialogDescription>{t('placement:qr.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-lg border bg-white p-2"
            role="img"
            aria-label={t('placement:qr.title', { name: petName })}
          />
        </div>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          {t('placement:qr.download')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
