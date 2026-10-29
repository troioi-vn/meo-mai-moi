import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLoadingSpinner } from '@/components/ui/page-loading-spinner'
import { useGetPlacementRequestsId } from '@/api/generated'
import type { PlacementRequestDetail } from '@/types/placement'
import { requestUrl, posterHeadline, petLocation, posterNotes } from './poster-content'

/**
 * A one-page printable poster for a placement request.
 *
 * Rescues already tape paper to lampposts, vet noticeboards and the inside of a
 * carrier. The app could produce a bare QR PNG, which left the person to build
 * the poster around it in whatever they had to hand. This is the poster: photo,
 * name, what is being asked for, where, and a QR big enough to scan from arm's
 * length.
 *
 * Deliberately chrome-free and print-sized rather than a PDF endpoint. The
 * browser's own print dialog produces the PDF, which keeps web fonts, the four
 * locales and right-sizing for whatever paper is actually loaded, and adds no
 * server-side rendering path to maintain.
 */
export function PlacementPosterPage() {
  const { t } = useTranslation(['common', 'placement'])
  const { id } = useParams<{ id: string }>()
  const numericId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const { data, isLoading, isError } = useGetPlacementRequestsId(numericId ?? 0, {
    query: { enabled: numericId !== null },
  })

  // The orval mutator already unwraps the `{ data }` envelope.
  const request = data as PlacementRequestDetail | undefined
  const url = useMemo(() => (numericId === null ? null : requestUrl(numericId)), [numericId])

  useEffect(() => {
    if (url === null) return

    // A rendered <img> survives printing, where a <canvas> is sometimes dropped.
    QRCode.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch((error: unknown) => {
        console.error('Failed to generate poster QR code', error)
      })
  }, [url])

  if (numericId === null || isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t('common:errors.generic')}</p>
      </div>
    )
  }

  if (isLoading || !request || url === null) {
    return <PageLoadingSpinner />
  }

  const headline = posterHeadline(request, t)
  const location = petLocation(request.pet)
  const notes = posterNotes(request)

  return (
    <>
      {/* @page cannot be expressed in a utility class. A4 is the paper everywhere
          the app is used; `portrait` keeps a landscape default from cropping. */}
      <style>{'@page { size: A4 portrait; margin: 10mm; }'}</style>

      <div className="mx-auto max-w-[210mm] p-4 print:p-0">
        <div className="mb-4 flex justify-end print:hidden">
          <Button
            onClick={() => {
              window.print()
            }}
          >
            <Printer className="mr-2 h-4 w-4" />
            {t('placement:poster.print')}
          </Button>
        </div>

        <article className="flex flex-col gap-6 rounded-lg border bg-white p-8 text-black print:gap-8 print:rounded-none print:border-0 print:p-0">
          <header className="text-center">
            <h1 className="text-4xl leading-tight font-extrabold">{headline}</h1>
            {location !== null && <p className="mt-2 text-2xl">{location}</p>}
          </header>

          {request.pet.photo_url !== null && request.pet.photo_url !== undefined && (
            <img
              src={request.pet.photo_url}
              alt={request.pet.name}
              className="mx-auto max-h-[95mm] w-full rounded-lg object-cover"
            />
          )}

          {notes !== null && <p className="text-xl leading-relaxed">{notes}</p>}

          <footer className="mt-auto flex items-center gap-6 border-t pt-6">
            {qrDataUrl !== null && (
              <img
                src={qrDataUrl}
                alt={t('placement:qr.title', { name: request.pet.name })}
                className="h-[45mm] w-[45mm] shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-2xl font-bold">{t('placement:poster.scanPrompt')}</p>
              <p className="mt-1 text-lg break-all">{url}</p>
              <p className="mt-3 text-base">{t('placement:poster.tagline')}</p>
            </div>
          </footer>
        </article>
      </div>
    </>
  )
}

export default PlacementPosterPage
