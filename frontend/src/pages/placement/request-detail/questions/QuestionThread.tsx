import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TranslatedTextBlock } from '@/components/translation/TranslatedTextBlock'
import type { PlacementQuestion } from '@/types/placement-question'
import { Eye, EyeOff, Languages, MessageSquareReply } from 'lucide-react'

interface QuestionThreadProps {
  question: PlacementQuestion
  canModerate: boolean
  busy: boolean
  onAnswer: (question: PlacementQuestion) => void
  onHide: (question: PlacementQuestion) => void
  onUnhide: (question: PlacementQuestion) => void
  onTranslate: (question: PlacementQuestion) => void
  onTranslationPending: () => void
}

export function QuestionThread({
  question,
  canModerate,
  busy,
  onAnswer,
  onHide,
  onUnhide,
  onTranslate,
  onTranslationPending,
}: QuestionThreadProps) {
  const { t } = useTranslation('placement')

  const needsOnDemandTranslation =
    question.status === 'published' && question.translation_within_budget === false

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{question.asker_name}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(question.created_at).toLocaleDateString()}
        </span>

        {question.status !== 'published' && (
          <Badge variant={question.status === 'pending' ? 'secondary' : 'outline'}>
            {t(`questions.status.${question.status}`)}
          </Badge>
        )}
      </div>

      <TranslatedTextBlock
        text={question.question}
        translation={question.question_translation}
        onPending={onTranslationPending}
        className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-6 text-foreground/90"
      />

      {question.is_answered && (
        <div className="mt-4 border-l-2 border-primary/40 pl-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {question.answered_by_name
              ? t('questions.answeredBy', { name: question.answered_by_name })
              : t('questions.answeredByPreviousOwner')}
          </p>
          <TranslatedTextBlock
            text={question.answer}
            translation={question.answer_translation}
            onPending={onTranslationPending}
            className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-6 text-foreground/80"
          />
        </div>
      )}

      {/* The person who approved this thread could read one of the four
          languages it publishes in. Anyone reading one of the other three is
          reading a machine, and should be told so. */}
      {question.machine_translated && (
        <p className="mt-3 text-[11px] text-muted-foreground">{t('questions.machineTranslated')}</p>
      )}

      {needsOnDemandTranslation && (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="mt-2 h-auto p-0 text-[11px] font-normal text-muted-foreground"
          disabled={busy}
          onClick={() => {
            onTranslate(question)
          }}
        >
          <Languages className="mr-1 h-3 w-3" />
          {t('questions.translateOnDemand')}
        </Button>
      )}

      {canModerate && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              onAnswer(question)
            }}
          >
            <MessageSquareReply className="mr-1 h-4 w-4" />
            {question.is_answered ? t('questions.editAnswer') : t('questions.answer')}
          </Button>

          {question.status === 'hidden' ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                onUnhide(question)
              }}
            >
              <Eye className="mr-1 h-4 w-4" />
              {t('questions.unhide')}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                onHide(question)
              }}
            >
              <EyeOff className="mr-1 h-4 w-4" />
              {t('questions.hide')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
