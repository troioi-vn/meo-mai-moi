import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/lib/i18n-toast'
import {
  useGetPlacementRequestsIdQuestions,
  postPlacementRequestsIdQuestions,
  postPlacementQuestionsQuestionAnswer,
  postPlacementQuestionsQuestionHide,
  postPlacementQuestionsQuestionUnhide,
  postPlacementQuestionsQuestionTranslate,
} from '@/api/generated/placement-questions/placement-questions'
import type { PlacementQuestion } from '@/types/placement-question'
import { AskQuestionForm } from './AskQuestionForm'
import { QuestionThread } from './QuestionThread'
import { MessageCircleQuestion } from 'lucide-react'

interface PublicQuestionsSectionProps {
  placementRequestId: number
  /** True when the viewer may answer and moderate, i.e. canManagePlacements. */
  canModerate: boolean
  /** False once the listing stops taking new questions. */
  acceptingQuestions: boolean
}

export function PublicQuestionsSection({
  placementRequestId,
  canModerate,
  acceptingQuestions,
}: PublicQuestionsSectionProps) {
  const { t } = useTranslation('placement')
  const [searchParams, setSearchParams] = useSearchParams()

  const [asking, setAsking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [answering, setAnswering] = useState<PlacementQuestion | null>(null)
  const [answerText, setAnswerText] = useState('')

  const {
    data,
    isPending: loading,
    refetch,
  } = useGetPlacementRequestsIdQuestions(placementRequestId)

  const questions = (data ?? []) as unknown as PlacementQuestion[]

  // Pending translations poll, and every mutation below re-reads the thread, so
  // one refetch is all any of them needs.
  const load = async () => {
    await refetch()
  }

  // The confirmation link in the asker's email bounces back here with a flag.
  useEffect(() => {
    const confirmed = searchParams.get('question_confirmed')
    if (confirmed === null) return

    if (confirmed === '1') {
      toast.success(t('questions.confirmed'))
    } else {
      toast.error(t('questions.confirmFailed'))
    }

    const next = new URLSearchParams(searchParams)
    next.delete('question_confirmed')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, t])

  const handleAsk = async (values: {
    asker_name: string
    asker_email?: string
    question: string
    altcha: string
  }) => {
    setSubmitting(true)
    try {
      await postPlacementRequestsIdQuestions(placementRequestId, values)
      setAsking(false)
      toast.success(t('questions.submitted'))
      await load()
    } catch {
      toast.error(t('questions.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnswerSubmit = async () => {
    if (!answering || answerText.trim() === '') return

    setBusyId(answering.id)
    try {
      await postPlacementQuestionsQuestionAnswer(answering.id, { answer: answerText.trim() })
      setAnswering(null)
      setAnswerText('')
      await load()
    } catch {
      toast.error(t('questions.answerFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const runModeration = async (question: PlacementQuestion, action: 'hide' | 'unhide') => {
    setBusyId(question.id)
    try {
      if (action === 'hide') {
        await postPlacementQuestionsQuestionHide(question.id)
      } else {
        await postPlacementQuestionsQuestionUnhide(question.id)
      }
      await load()
    } catch {
      toast.error(t('questions.moderationFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const handleTranslate = async (question: PlacementQuestion) => {
    setBusyId(question.id)
    try {
      await postPlacementQuestionsQuestionTranslate(question.id)
      await load()
    } catch {
      toast.error(t('questions.translateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = questions.filter((question) => question.status === 'pending').length

  return (
    <Card className="mb-6" id="questions">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircleQuestion className="h-5 w-5" />
          {t('questions.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {canModerate && pendingCount > 0 && (
          <Alert>
            <AlertDescription>
              {t('questions.pendingNotice', { count: pendingCount })}
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('questions.loading')}</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('questions.empty')}</p>
        ) : (
          <div className="space-y-3">
            {questions.map((question) => (
              <div key={question.id} className="space-y-3">
                <QuestionThread
                  question={question}
                  canModerate={canModerate}
                  busy={busyId === question.id}
                  onAnswer={(target) => {
                    setAnswering(target)
                    setAnswerText(target.answer ?? '')
                  }}
                  onHide={(target) => void runModeration(target, 'hide')}
                  onUnhide={(target) => void runModeration(target, 'unhide')}
                  onTranslate={(target) => void handleTranslate(target)}
                  onTranslationPending={() => void load()}
                />

                {answering?.id === question.id && (
                  <div className="space-y-2 rounded-lg border border-dashed p-3">
                    <Textarea
                      rows={3}
                      value={answerText}
                      maxLength={2000}
                      placeholder={t('questions.answerPlaceholder')}
                      onChange={(event) => {
                        setAnswerText(event.target.value)
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t('questions.answerPublishesWarning')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === question.id || answerText.trim() === ''}
                        onClick={() => void handleAnswerSubmit()}
                      >
                        {t('questions.publishAnswer')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAnswering(null)
                          setAnswerText('')
                        }}
                      >
                        {t('questions.form.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {acceptingQuestions &&
          !canModerate &&
          (asking ? (
            <AskQuestionForm
              submitting={submitting}
              onSubmit={(values) => void handleAsk(values)}
              onCancel={() => {
                setAsking(false)
              }}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAsking(true)
              }}
            >
              {t('questions.ask')}
            </Button>
          ))}
      </CardContent>
    </Card>
  )
}
