import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AltchaWidget } from '@/components/altcha/AltchaWidget'
import { Info } from 'lucide-react'

const QUESTION_MAX_LENGTH = 1000
const NAME_MAX_LENGTH = 80

interface AskQuestionFormProps {
  submitting: boolean
  onSubmit: (values: {
    asker_name: string
    asker_email?: string
    question: string
    altcha: string
  }) => void
  onCancel: () => void
}

export function AskQuestionForm({ submitting, onSubmit, onCancel }: AskQuestionFormProps) {
  const { t } = useTranslation('placement')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [question, setQuestion] = useState('')
  const [altcha, setAltcha] = useState('')

  const handleVerified = useCallback((payload: string) => {
    setAltcha(payload)
  }, [])

  const handleReset = useCallback(() => {
    setAltcha('')
  }, [])

  const canSubmit =
    name.trim().length >= 2 && question.trim().length >= 5 && altcha !== '' && !submitting

  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSubmit) return

        onSubmit({
          asker_name: name.trim(),
          asker_email: email.trim() === '' ? undefined : email.trim(),
          question: question.trim(),
          altcha,
        })
      }}
    >
      {/* Said before they type, not after they submit. Someone asking about a
          rescue animal may well be about to type something they would not want
          on a public page under their own name. */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t('questions.publicWarning')}</AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="question-asker-name">{t('questions.form.name')}</Label>
          <Input
            id="question-asker-name"
            value={name}
            maxLength={NAME_MAX_LENGTH}
            required
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
          <p className="text-[11px] text-muted-foreground">{t('questions.form.nameHint')}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="question-asker-email">{t('questions.form.email')}</Label>
          <Input
            id="question-asker-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
            }}
          />
          <p className="text-[11px] text-muted-foreground">{t('questions.form.emailHint')}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="question-body">{t('questions.form.question')}</Label>
        <Textarea
          id="question-body"
          rows={4}
          value={question}
          maxLength={QUESTION_MAX_LENGTH}
          required
          onChange={(event) => {
            setQuestion(event.target.value)
          }}
        />
        <p className="text-right text-[11px] text-muted-foreground">
          {question.length} / {QUESTION_MAX_LENGTH}
        </p>
      </div>

      <AltchaWidget onVerified={handleVerified} onReset={handleReset} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {t('questions.form.submit')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t('questions.form.cancel')}
        </Button>
      </div>
    </form>
  )
}
