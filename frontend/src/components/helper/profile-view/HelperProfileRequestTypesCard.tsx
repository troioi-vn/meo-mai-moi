import { Heart, Home } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { HelperProfile } from '@/types/helper-profile'
import { useTranslation } from 'react-i18next'

export function HelperProfileRequestTypesCard({ profile }: { profile: HelperProfile }) {
  const { t } = useTranslation(['helper', 'common'])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {t('helper:view.sections.requestTypes')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {profile.request_types?.includes('foster_paid') && (
            <Badge variant="default" className="text-sm">
              <Home className="h-3 w-3 mr-1" />
              {t('common:helperProfiles.requestTypes.foster_paid')}
            </Badge>
          )}
          {profile.request_types?.includes('foster_free') && (
            <Badge variant="default" className="text-sm">
              <Home className="h-3 w-3 mr-1" />
              {t('common:helperProfiles.requestTypes.foster_free')}
            </Badge>
          )}
          {profile.request_types?.includes('permanent') && (
            <Badge variant="default" className="text-sm">
              <Heart className="h-3 w-3 mr-1" />
              {t('helper:form.types.permanent')}
            </Badge>
          )}
          {profile.request_types?.includes('pet_sitting') && (
            <Badge variant="default" className="text-sm">
              <Heart className="h-3 w-3 mr-1" />
              {t('common:helperProfiles.requestTypes.pet_sitting')}
            </Badge>
          )}
          {(!profile.request_types || profile.request_types.length === 0) && (
            <span className="text-sm text-muted-foreground">{t('helper:view.noRequestTypes')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
