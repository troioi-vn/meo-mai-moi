import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

export function HelperProfileContactInfoCard({ contactInfo }: { contactInfo?: string }) {
  const { t } = useTranslation('helper')

  if (!contactInfo) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t('view.sections.contactInfo')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contactInfo}</p>
      </CardContent>
    </Card>
  )
}
