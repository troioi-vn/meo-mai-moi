import { useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { getCroppedFile } from '@/lib/crop-image'

export interface ImageCropperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | Blob | null
  aspect?: number
  cropShape?: 'rect' | 'round'
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp'
  outputMaxSize?: number
  title?: string
  onCropped: (result: File) => void
  onCancel?: () => void
}

const fileNameFromBlob = (file: File | Blob) => (file instanceof File ? file.name : 'image.jpg')

export function ImageCropperDialog({
  open,
  onOpenChange,
  file,
  aspect,
  cropShape = 'rect',
  outputType = 'image/jpeg',
  outputMaxSize,
  title,
  onCropped,
  onCancel,
}: ImageCropperDialogProps) {
  const { t } = useTranslation('media')
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    if (!file) {
      setSourceUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setSourceUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleApply = async () => {
    if (!sourceUrl || !file || !croppedAreaPixels) return

    setIsApplying(true)
    try {
      const croppedFile = await getCroppedFile(sourceUrl, croppedAreaPixels, {
        fileName: fileNameFromBlob(file),
        outputType,
        outputMaxSize,
        rotation,
      })
      onCropped(croppedFile)
      onOpenChange(false)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[calc(100dvh-1rem)] max-h-[100dvh] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:h-[80vh] sm:max-h-[80vh]">
        <DialogHeader className="shrink-0 p-4 pb-3">
          <DialogTitle>{title ?? t('crop.title')}</DialogTitle>
          <DialogDescription>{t('crop.instructions')}</DialogDescription>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 bg-black">
          {sourceUrl && (
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={cropShape}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => {
                setCroppedAreaPixels(areaPixels)
              }}
            />
          )}
        </div>

        <div className="shrink-0 space-y-4 border-t p-4">
          <label className="grid gap-2 text-sm font-medium">
            {t('crop.zoom')}
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => {
                setZoom(Number(event.currentTarget.value))
              }}
              aria-label={t('crop.zoom')}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setRotation((value) => (value + 90) % 360)
            }}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            {t('crop.rotate')}
          </Button>
        </div>

        <DialogFooter className="shrink-0 border-t p-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t('crop.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleApply()
            }}
            disabled={isApplying || !croppedAreaPixels}
          >
            {t('crop.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
