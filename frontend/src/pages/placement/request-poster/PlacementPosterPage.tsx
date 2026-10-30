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
  const [qrFailed, setQrFailed] = useState(false)

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
      .then((dataUrl) => {
        setQrDataUrl(dataUrl)
        setQrFailed(false)
      })
      .catch((error: unknown) => {
        console.error('Failed to generate poster QR code', error)
        // The QR is the poster's only call to action. Without it the sheet is
        // decoration, so say so instead of printing one quietly short of it.
        setQrFailed(true)
      })
  }, [url])

  const genericError = (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">{t('common:errors.generic')}</p>
    </div>
  )

  if (numericId === null || isError) return genericError

  if (isLoading || !request || url === null) {
    return <PageLoadingSpinner />
  }

  // Anonymous visitors may only read open listings (`PlacementRequestPolicy::view`),
  // but an owner keeps the owner layout at every status. Printing a closed listing
  // would send whoever scans the sheet to a page they cannot open. Checked before
  // the QR, so a closed listing says why rather than blaming the code.
  if (request.status !== 'open') {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t('placement:poster.notOpen')}</p>
      </div>
    )
  }

  if (qrFailed) return genericError

  if (qrDataUrl === null) return <PageLoadingSpinner />

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

        {/* The print height is A4 minus the 10mm margins above, which keeps
            unusually long copy from spilling onto a second, mostly empty page. */}
        <article className="flex flex-col gap-6 rounded-lg border bg-white p-8 text-black print:h-[277mm] print:gap-8 print:rounded-none print:border-0 print:p-0">
          {/* Only this region may be clipped by the one-page bound. The QR below
              is the whole point of the sheet, so it keeps its space first and a
              very long name or note loses its tail instead. */}
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden print:gap-8">
            <header className="text-center">
              <h1 className="text-4xl leading-tight font-extrabold">{headline}</h1>
              {location !== null && <p className="mt-2 text-2xl">{location}</p>}
            </header>

            {request.pet.photo_url !== null && request.pet.photo_url !== undefined && (
              <img
                src={request.pet.photo_url}
                alt={request.pet.name}
                className="mx-auto max-h-[95mm] w-full min-h-0 rounded-lg object-cover"
              />
            )}

            {notes !== null && <p className="text-xl leading-relaxed">{notes}</p>}
          </div>

          <footer className="flex shrink-0 items-center gap-6 border-t pt-6">
            <img
              src={qrDataUrl}
              alt={t('placement:qr.title', { name: request.pet.name })}
              className="h-[45mm] w-[45mm] shrink-0"
            />
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
