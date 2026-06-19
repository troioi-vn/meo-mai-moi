import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type MediaImageState = 'loading' | 'loaded' | 'error'

interface MediaImageProps {
  src: string
  thumbSrc?: string | null
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
  const hasProgressiveSource = Boolean(thumbSrc && thumbSrc !== src)
  const initialSrc = hasProgressiveSource ? (thumbSrc ?? src) : src
  const imageRef = useRef<HTMLImageElement>(null)
  const [renderedSrc, setRenderedSrc] = useState(initialSrc)
  const [state, setState] = useState<MediaImageState>('loading')
  const [fullLoaded, setFullLoaded] = useState(!hasProgressiveSource)

  useEffect(() => {
    const nextHasProgressiveSource = Boolean(thumbSrc && thumbSrc !== src)
    setRenderedSrc(nextHasProgressiveSource ? (thumbSrc ?? src) : src)
    setState('loading')
    setFullLoaded(!nextHasProgressiveSource)
  }, [src, thumbSrc])

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
  }, [hasProgressiveSource, src])

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
      <img
        ref={imageRef}
        src={renderedSrc}
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
      {overlay && <div className="absolute inset-0 pointer-events-none">{overlay}</div>}
    </div>
  )
}
