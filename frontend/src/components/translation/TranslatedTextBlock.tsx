import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ContentTranslation } from '@/types/content-translation'

const PENDING_POLL_INTERVAL_MS = 2500
const MAX_PENDING_POLLS = 12

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

  useEffect(() => {
    if (translation?.status !== 'pending' || !onPendingRef.current) return

    let pollCount = 0
    let timeoutId = 0
    let cancelled = false

    const schedulePoll = () => {
      if (cancelled || pollCount >= MAX_PENDING_POLLS || statusRef.current !== 'pending') return

      timeoutId = window.setTimeout(() => {
        if (cancelled || statusRef.current !== 'pending' || !onPendingRef.current) return
        pollCount += 1
        onPendingRef.current()
        schedulePoll()
      }, PENDING_POLL_INTERVAL_MS)
    }

    schedulePoll()

    return () => {
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
            setShowOriginal((current) => !current)
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
