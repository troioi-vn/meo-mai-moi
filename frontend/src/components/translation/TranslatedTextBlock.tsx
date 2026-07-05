import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ContentTranslation } from '@/types/content-translation'

const PENDING_POLL_INTERVAL_MS = 2500
const MAX_PENDING_POLLS = 12

const translationDebug = (event: string, payload?: Record<string, unknown>) => {
  if (!import.meta.env.DEV) return
  console.log('[Translation]', event, payload ?? '')
}

interface TranslatedTextBlockProps {
  text?: string | null
  translation?: ContentTranslation | null
  className?: string
  onPending?: () => void
}

export function TranslatedTextBlock({
  text,
  translation,
  className,
  onPending,
}: TranslatedTextBlockProps) {
  const { t } = useTranslation('common')
  const [showOriginal, setShowOriginal] = useState(false)
  const onPendingRef = useRef(onPending)
  const statusRef = useRef(translation?.status)
  onPendingRef.current = onPending
  statusRef.current = translation?.status
  const original = translation?.original ?? text ?? ''
  const translated = translation?.translated ?? null
  const canToggle = Boolean(translated)
  const isPending = translation?.status === 'pending'
  const displayText = canToggle && !showOriginal ? translated : original
  const displayBranch =
    canToggle && !showOriginal ? 'translated' : original ? 'original' : 'fallback'

  useEffect(() => {
    const originalPreview =
      original.length > 40 ? `${original.slice(0, 40)}…` : original || undefined

    translationDebug('props', {
      status: translation?.status,
      original_locale: translation?.original_locale,
      viewer_locale: translation?.viewer_locale,
      is_translated: translation?.is_translated,
      hasTranslated: Boolean(translated),
      hasOnPending: Boolean(onPending),
      originalLength: original.length,
      translatedLength: translated?.length ?? 0,
      originalPreview,
      hasResponseMeta: Boolean(translation?.response_meta),
    })

    if (translation?.response_meta) {
      translationDebug('openrouter', translation.response_meta)
    }

    translationDebug('display', {
      showOriginal,
      canToggle,
      isPending,
      displayBranch,
    })
  }, [
    translation,
    text,
    original,
    translated,
    showOriginal,
    canToggle,
    isPending,
    displayBranch,
    onPending,
  ])

  useEffect(() => {
    if (translation?.status !== 'pending' || !onPendingRef.current) return

    let pollCount = 0
    let timeoutId = 0
    let cancelled = false

    translationDebug('poll:start', {
      intervalMs: PENDING_POLL_INTERVAL_MS,
      maxPolls: MAX_PENDING_POLLS,
    })

    const schedulePoll = () => {
      if (cancelled || pollCount >= MAX_PENDING_POLLS || statusRef.current !== 'pending') {
        if (!cancelled && pollCount >= MAX_PENDING_POLLS) {
          translationDebug('poll:stop', { reason: 'max_polls', pollCount })
        } else if (!cancelled && statusRef.current !== 'pending') {
          translationDebug('poll:stop', {
            reason: 'status_changed',
            pollCount,
            status: statusRef.current,
          })
        }
        return
      }

      timeoutId = window.setTimeout(() => {
        if (cancelled || statusRef.current !== 'pending' || !onPendingRef.current) return
        pollCount += 1
        translationDebug('poll:tick', { pollCount, status: statusRef.current })
        onPendingRef.current()
        schedulePoll()
      }, PENDING_POLL_INTERVAL_MS)
    }

    schedulePoll()

    return () => {
      if (!cancelled) {
        translationDebug('poll:stop', { reason: 'unmount', pollCount })
      }
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [translation?.status])

  if (!displayText) return null

  return (
    <div className="space-y-1">
      <p className={className}>{displayText}</p>
      {canToggle && (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="h-auto p-0 text-[11px] font-normal text-muted-foreground"
          onClick={() => {
            setShowOriginal((current) => {
              const next = !current
              translationDebug('toggle', { showOriginal: next })
              return next
            })
          }}
        >
          {showOriginal ? t('translation.showTranslation') : t('translation.showOriginal')}
        </Button>
      )}
      {isPending && (
        <span className="text-[11px] font-normal text-muted-foreground">
          {t('translation.inProgress')}
        </span>
      )}
    </div>
  )
}
