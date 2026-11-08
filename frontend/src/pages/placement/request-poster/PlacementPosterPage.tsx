import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLoadingSpinner } from '@/components/ui/page-loading-spinner'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'
import { authIsSettled } from '@/contexts/auth-context'
import { printPoster, type PosterPrintState } from './print-poster'
import { localeNames, supportedLocales } from '@/i18n'
import type { PlacementRequestDetail } from '@/types/placement'
import type { Pet } from '@/types/pet'
import { requestUrl, posterHeadline, petLocation, posterNotes, posterFacts } from './poster-content'
import {
  positiveId,
  posterSettings,
  writePosterSettings,
  type PosterSettings,
} from './poster-settings'
import { PosterPhoto } from './PosterPhoto'
import { PosterHeadline, PosterNotes } from './PosterText'
import './poster.css'

type PetSections = Record<
  'owned' | 'shared' | 'fostering_active' | 'fostering_past' | 'group_past',
  Pet[]
>

export function PlacementPosterPage() {
  const { t, i18n } = useTranslation(['common', 'placement', 'pets'])
  const { isAuthenticated, status: authStatus } = useAuth()
  const authReady = authIsSettled(authStatus)
  const { id } = useParams<{ id: string }>()
  const numericId = positiveId(id)
  const [params, setParams] = useSearchParams()
  const [defaultLanguage] = useState(() => i18n.resolvedLanguage ?? i18n.language)
  const settings = posterSettings(params, defaultLanguage)
  const posterT = i18n.getFixedT(settings.lang)
  const update = (patch: Partial<PosterSettings>) => {
    setParams(writePosterSettings(params, { ...settings, ...patch }), { replace: true })
  }

  const {
    data: request,
    isFetching: requestFetching,
    isError,
  } = useQuery({
    queryKey: ['placement-poster', numericId, settings.lang],
    queryFn: () =>
      api.get<PlacementRequestDetail>(`/placement-requests/${String(numericId)}`, {
        headers: { 'Accept-Language': settings.lang },
      }),
    // Guest bootstrap clears the global query client after its 401 retry.
    // Start only after that cleanup, rather than rendering a sheet it can erase.
    enabled: numericId !== null && authReady,
    placeholderData: (previous) =>
      previous?.id === numericId && previous.status === 'open' ? previous : undefined,
  })
  const {
    data: pet,
    isPending: petPending,
    isError: petError,
    isFetching: petFetching,
  } = useQuery({
    queryKey: ['poster-pet', request?.pet.id, settings.lang],
    queryFn: () =>
      api.get<Pet>(`/pets/${String(request?.pet.id)}`, {
        headers: { 'Accept-Language': settings.lang },
      }),
    enabled: authReady && request?.status === 'open',
    placeholderData: (previous) => (previous?.id === request?.pet.id ? previous : undefined),
  })
  const { data: sections, isFetching: healthFetching } = useQuery({
    queryKey: ['poster-health-sections', settings.lang],
    queryFn: () =>
      api.get<PetSections>('/my-pets/sections', {
        headers: { 'Accept-Language': settings.lang },
      }),
    enabled: isAuthenticated && request?.available_actions.can_print_poster === true,
  })
  const healthPet =
    sections &&
    [
      ...sections.owned,
      ...sections.shared,
      ...sections.fostering_active,
      ...sections.fostering_past,
      ...sections.group_past,
    ].find((item) => item.id === request?.pet.id)
  const photos = pet?.photos ?? []
  const selected =
    settings.photo === null
      ? (photos.find((photo) => photo.is_primary) ?? photos[0])
      : photos.find((photo) => photo.id === settings.photo)
  const stalePhoto = settings.photo !== null && !petPending && !petError && !selected
  const canonicalizedId = useRef<number | null>(null)
  useEffect(() => {
    if (!authReady || !numericId || !pet || canonicalizedId.current === numericId) return
    canonicalizedId.current = numericId
    // Defaults and the initial primary photo are written together, once. A
    // fully specified URL is already canonical, including an unescaped comma.
    const canonical = writePosterSettings(params, {
      ...settings,
      photo: settings.photo ?? selected?.id ?? null,
    })
    if (canonical.toString() !== params.toString()) setParams(canonical, { replace: true })
  }, [authReady, numericId, pet, params, settings, selected, setParams])
  const photoUrl = selected?.medium_url ?? selected?.url
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null)
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const photoFailed = photoUrl !== undefined && failedPhoto === photoUrl
  const [qr, setQr] = useState<{ url: string; main: string; tab: string } | null>(null)
  const [qrFailed, setQrFailed] = useState(false)
  const url = numericId === null ? null : requestUrl(numericId)
  useEffect(() => {
    if (!url) return
    let active = true
    Promise.all([
      QRCode.toDataURL(url, { width: 640, margin: 4, errorCorrectionLevel: 'M' }),
      QRCode.toDataURL(url, { width: 320, margin: 4, errorCorrectionLevel: 'M' }),
    ])
      .then(([main, tab]) => {
        if (active) {
          setQr({ url, main, tab })
          setQrFailed(false)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to generate poster QR code', error)
        if (active) setQrFailed(true)
      })
    return () => {
      active = false
    }
  }, [url])

  const preview = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const sheetWidth = settings.paper === 'letter' ? 185.9 : 180
  const sheetHeight = settings.paper === 'letter' ? 248.4 : 266
  useEffect(() => {
    const element = preview.current
    if (!element) return
    const resize = () => {
      setScale(Math.min(1, element.clientWidth / ((sheetWidth * 96) / 25.4)))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [sheetWidth, request, qr])

  const cannotPrint =
    !authReady ||
    !request ||
    requestFetching ||
    petFetching ||
    healthFetching ||
    stalePhoto ||
    petPending ||
    (petError && !pet) ||
    photoFailed ||
    (!!selected && !photoUrl) ||
    (!!photoUrl && loadedPhoto !== photoUrl)
  const printState = useRef<PosterPrintState | null>(null)
  const printing = useRef(false)
  const revision = JSON.stringify([
    numericId,
    settings,
    request?.pet,
    request?.request_type,
    request?.status,
    request?.notes,
    request?.notes_translation,
    pet,
    healthPet,
  ])
  useLayoutEffect(() => {
    printState.current = {
      sheet: preview.current?.querySelector('article') ?? null,
      ready: !cannotPrint && qr?.url === url && !qrFailed && request.status === 'open',
      revision,
    }
  })

  const error = (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">{t('common:errors.generic')}</p>
    </div>
  )
  if (numericId === null || (isError && !request)) return error
  if (!authReady || !request || !url) return <PageLoadingSpinner />
  if (request.status !== 'open')
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t('placement:poster.notOpen')}</p>
      </div>
    )
  if (qrFailed) return error
  if (!qr || qr.url !== url) return <PageLoadingSpinner />

  const notes = posterNotes(request)
  const fallbackNotes =
    !!request.notes?.trim() &&
    !request.notes_translation?.is_translated &&
    (request.notes_translation?.original_locale ?? request.notes_locale) !== settings.lang
  const location = petLocation(request.pet)
  const compactUrl = url.replace(/^https?:\/\//, '')
  const facts = pet ? posterFacts(pet, healthPet?.health_summary, posterT) : ''

  return (
    <div className="poster-workspace">
      <style>{`@page { size: ${settings.paper === 'letter' ? 'Letter' : 'A4'} portrait; margin: 15mm; }`}</style>
      <div className="poster-editor print:hidden">
        <div className="poster-settings">
          <label>
            {t('placement:poster.language')}
            <select
              aria-label={t('placement:poster.language')}
              value={settings.lang}
              onChange={(event) => {
                update({
                  lang: posterSettings(new URLSearchParams({ lang: event.target.value }), 'en')
                    .lang,
                })
              }}
            >
              {supportedLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('placement:poster.paper')}
            <select
              aria-label={t('placement:poster.paper')}
              value={settings.paper}
              onChange={(event) => {
                update({ paper: event.target.value === 'letter' ? 'letter' : 'a4' })
              }}
            >
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </select>
          </label>
          <label>
            <span>
              <input
                type="checkbox"
                checked={settings.tabs}
                onChange={(event) => {
                  update({ tabs: event.target.checked })
                }}
              />{' '}
              {t('placement:poster.tabs')}
            </span>
          </label>
          <Button
            disabled={cannotPrint}
            onClick={() => {
              if (printing.current) return
              printing.current = true
              void printPoster(() => printState.current)
                .catch(() => false)
                .finally(() => {
                  printing.current = false
                })
            }}
          >
            <Printer className="mr-2 h-4 w-4" />
            {t('placement:poster.print')}
          </Button>
        </div>
        <p>{t('placement:poster.reposition')}</p>
        {photos.length > 0 && (
          <div className="poster-strip" role="group" aria-label={t('placement:poster.photos')}>
            {photos.map((photo, index) => (
              <button
                type="button"
                key={photo.id}
                aria-label={t('placement:poster.choosePhoto', { number: index + 1 })}
                aria-pressed={selected?.id === photo.id}
                onClick={() => {
                  update({ photo: photo.id, focus: [50, 50] })
                }}
              >
                <img src={photo.thumb_url ?? photo.url} alt="" />
              </button>
            ))}
          </div>
        )}
        {(stalePhoto || photoFailed || (petError && !pet) || (!!selected && !photoUrl)) && (
          <p role="alert">{t('placement:poster.photoUnavailable')}</p>
        )}
        {fallbackNotes && <p role="status">{t('placement:poster.originalNotes')}</p>}
      </div>
      <div ref={preview} style={{ width: '100%', maxWidth: `${String(sheetWidth)}mm` }}>
        <div className="poster-preview" style={{ height: `${String(sheetHeight * scale)}mm` }}>
          <article
            className="poster-sheet"
            data-paper={settings.paper}
            data-tabs={settings.tabs}
            lang={settings.lang}
            style={{ transform: `scale(${String(scale)})` }}
          >
            <div className="poster-main overflow-hidden">
              <header className="poster-heading">
                <PosterHeadline name={request.pet.name} text={posterHeadline(request, posterT)} />
                {location !== null && (
                  <p className="poster-location" title={location}>
                    {location}
                  </p>
                )}
                <p className="poster-facts" title={facts}>
                  {facts}
                </p>
              </header>
              {photoUrl && !photoFailed && (
                <PosterPhoto
                  key={photoUrl}
                  url={photoUrl}
                  name={request.pet.name}
                  label={t('placement:poster.reposition')}
                  focus={settings.focus}
                  onChange={(focus) => {
                    update({ focus })
                  }}
                  onError={() => {
                    setFailedPhoto(photoUrl)
                  }}
                  onLoad={() => {
                    setLoadedPhoto(photoUrl)
                  }}
                />
              )}
              {notes !== null && <PosterNotes text={notes} />}
            </div>
            <footer className="poster-footer shrink-0">
              <img src={qr.main} alt={posterT('placement:qr.title', { name: request.pet.name })} />
              <div className="poster-footer-copy">
                <p className="poster-scan">{posterT('placement:poster.scanPrompt')}</p>
                <p className="poster-url">{url}</p>
                <p className="poster-tagline">{posterT('placement:poster.tagline')}</p>
              </div>
            </footer>
            {settings.tabs && (
              <div className="poster-tabs">
                {[0, 1, 2, 3].map((index) => (
                  <div className="poster-tab" key={index}>
                    <img
                      src={qr.tab}
                      alt={posterT('placement:qr.title', { name: request.pet.name })}
                    />
                    <span>{compactUrl}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}

export default PlacementPosterPage
