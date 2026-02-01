import { useTranslation } from 'react-i18next'
import { Home, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function HelperProfilesEmptyStateCard({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation('common')
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-muted">
            <Home className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t('helperProfiles.noProfiles')}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t('helperProfiles.noProfilesHint')}
          </p>
        </div>
        <Button onClick={onCreate} className="mt-4">
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('helperProfiles.createFirst')}
        </Button>
      </CardContent>
    </Card>
  )
}
