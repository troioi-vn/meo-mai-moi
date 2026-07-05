import { User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'
import { TranslatedTextBlock } from '@/components/translation/TranslatedTextBlock'
import type { ContentTranslation } from '@/types/content-translation'

interface HelperProfileExperienceCardProps {
  experience?: string
  translation?: ContentTranslation | null
  onTranslationPending?: () => void
}

export function HelperProfileExperienceCard({
  experience,
  translation,
  onTranslationPending,
}: HelperProfileExperienceCardProps) {
  const { t } = useTranslation('helper')

  if (!experience) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          {t('view.sections.experience')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TranslatedTextBlock
          text={experience}
          translation={translation}
          onPending={onTranslationPending}
          className="text-sm text-muted-foreground whitespace-pre-wrap"
        />
      </CardContent>
    </Card>
  )
}
