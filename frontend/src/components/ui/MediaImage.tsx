import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { MediaImageSource, ResponsiveMediaFields } from '@/types/media'

type MediaImageState = 'loading' | 'loaded' | 'error'

interface MediaImageProps {
  src: string
  thumbSrc?: string | null
  media?: ResponsiveMediaFields | null
  srcSet?: string | null
  sources?: MediaImageSource[] | null
  sizes?: string
  width?: number | null
  height?: number | null
  alt: string
  className?: string
  containerClassName?: string
  aspect?: 'square' | 'video' | 'auto'
  loading?: 'lazy' | 'eager'
  fit?: 'cover' | 'contain'
  fallback?: React.ReactNode
  overlay?: React.ReactNode
  onClick?: () => void
}

const aspectClassName = {
  auto: '',
  square: 'aspect-square',
  video: 'aspect-video',
} satisfies Record<NonNullable<MediaImageProps['aspect']>, string>

export function MediaImage({
  src,
  thumbSrc,
  media,
  srcSet,
  sources,
  sizes,
  width,
  height,
  alt,
  className,
  containerClassName,
  aspect = 'auto',
  loading = 'lazy',
  fit = 'cover',
  fallback,
  overlay,
  onClick,
}: MediaImageProps) {
  const { t } = useTranslation('media')
  const responsiveSrcSet = media?.srcset ?? srcSet
  const responsiveSources = media?.sources ?? sources
  const intrinsicWidth = media?.width ?? width
  const intrinsicHeight = media?.height ?? height
  // Let <picture> choose and load an alternative format directly. Preloading the
  // fallback while a WebP source is available would download two full images.
  const hasProgressiveSource = Boolean(thumbSrc && thumbSrc !== src && !responsiveSources?.length)
  const initialSrc = hasProgressiveSource ? (thumbSrc ?? src) : src
  const imageRef = useRef<HTMLImageElement>(null)
  const [renderedSrc, setRenderedSrc] = useState(initialSrc)
  const [state, setState] = useState<MediaImageState>('loading')
  const [fullLoaded, setFullLoaded] = useState(!hasProgressiveSource)

  useEffect(() => {
    const nextHasProgressiveSource = Boolean(
      thumbSrc && thumbSrc !== src && !responsiveSources?.length
    )
    setRenderedSrc(nextHasProgressiveSource ? (thumbSrc ?? src) : src)
    setState('loading')
    setFullLoaded(!nextHasProgressiveSource)
  }, [responsiveSources?.length, src, thumbSrc])

  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth > 0) {
      setState('loaded')
    }
  }, [renderedSrc])

  useEffect(() => {
    if (!hasProgressiveSource) {
      return
    }

    const image = new Image()
    image.decoding = 'async'
    if (responsiveSrcSet) image.srcset = responsiveSrcSet
    if (sizes) image.sizes = sizes
    image.onload = () => {
      setFullLoaded(true)
      setRenderedSrc(src)
    }
    image.onerror = () => {
      setState('error')
    }
    image.src = src

    return () => {
      image.onload = null
      image.onerror = null
    }
  }, [hasProgressiveSource, responsiveSrcSet, sizes, src])

  const defaultFallback = useMemo(
    () => (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          aspectClassName[aspect],
          className
        )}
        role="img"
        aria-label={t('image.loadFailed')}
      >
        <ImageIcon className="h-8 w-8" aria-hidden="true" />
      </div>
    ),
    [aspect, className, t]
  )

  if (state === 'error') {
    return <>{fallback ?? defaultFallback}</>
  }

  const isShowingThumb = hasProgressiveSource && renderedSrc === thumbSrc && !fullLoaded
  const fitClassName = fit === 'contain' ? 'object-contain' : 'object-cover'

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectClassName[aspect],
        containerClassName
      )}
    >
      {state === 'loading' && !isShowingThumb && (
        <Skeleton className={cn(aspectClassName[aspect], className)} />
      )}
      <picture className="contents">
        {!isShowingThumb &&
          responsiveSources?.map((source) => (
            <source
              key={`${source.type}:${source.srcset}`}
              type={source.type}
              srcSet={source.srcset}
            />
          ))}
        <img
          ref={imageRef}
          src={renderedSrc}
          srcSet={!isShowingThumb ? (responsiveSrcSet ?? undefined) : undefined}
          sizes={!isShowingThumb && responsiveSrcSet ? sizes : undefined}
          width={intrinsicWidth ?? undefined}
          height={intrinsicHeight ?? undefined}
          alt={alt}
          className={cn(
            fitClassName,
            'transition-opacity motion-reduce:transition-none',
            isShowingThumb && 'scale-105 blur-sm motion-reduce:scale-100 motion-reduce:blur-none',
            state === 'loading' && !isShowingThumb ? 'absolute inset-0 opacity-0' : 'opacity-100',
            className
          )}
          loading={loading}
          decoding="async"
          onClick={onClick}
          onLoad={() => {
            setState('loaded')
          }}
          onError={() => {
            if (hasProgressiveSource && renderedSrc === thumbSrc) {
              setRenderedSrc(src)
              setState('loading')
              return
            }

            setState('error')
          }}
        />
      </picture>
      {isShowingThumb && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/25 p-1.5 shadow-sm backdrop-blur-[1px]">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white/95 motion-reduce:animate-none"
              data-slot="media-image-spinner"
            />
          </div>
        </div>
      )}
      {overlay && <div className="absolute inset-0 pointer-events-none">{overlay}</div>}
    </div>
  )
}
