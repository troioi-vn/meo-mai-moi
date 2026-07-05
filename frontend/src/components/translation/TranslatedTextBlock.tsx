import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ContentTranslation } from '@/types/content-translation'

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
  const original = translation?.original ?? text ?? ''
  const translated = translation?.translated ?? null
  const canToggle = Boolean(translated)
  const displayText = canToggle && !showOriginal ? translated : original

  useEffect(() => {
    if (translation?.status !== 'pending' || !onPending) return

    const timeoutId = window.setTimeout(() => {
      onPending()
    }, 2500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [onPending, translation?.status])

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
    </div>
  )
}
