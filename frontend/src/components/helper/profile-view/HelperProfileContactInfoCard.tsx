import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getContactDetailDisplayText,
  getContactDetailHref,
  getContactDetailOptions,
} from '@/lib/helper-contact-details'
import type { HelperContactDetail } from '@/types/helper-profile'
import { useTranslation } from 'react-i18next'

export function HelperProfileContactInfoCard({
  contactDetails,
}: {
  contactDetails?: HelperContactDetail[]
}) {
  const { t } = useTranslation('helper')
  const labels = new Map(getContactDetailOptions(t).map((option) => [option.type, option.label]))

  if (!contactDetails || contactDetails.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t('view.sections.contactInfo')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contactDetails.map((contactDetail, index) => {
          const href = getContactDetailHref(contactDetail)
          const displayText = getContactDetailDisplayText(contactDetail)

          return (
            <div key={`${contactDetail.type}-${contactDetail.value}-${index}`} className="text-sm">
              <p className="font-medium">{labels.get(contactDetail.type) ?? contactDetail.type}</p>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground underline underline-offset-4 break-all"
                >
                  {displayText}
                </a>
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap break-words">
                  {displayText}
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
