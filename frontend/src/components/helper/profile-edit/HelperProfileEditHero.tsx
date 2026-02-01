import { UserCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function HelperProfileEditHero() {
  const { t } = useTranslation('common')

  return (
    <div className="mb-8 text-center">
      <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
        <UserCog className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        {t('common:helperProfiles.edit.title')}
      </h1>
      <p className="text-muted-foreground max-w-lg mx-auto">
        {t('common:helperProfiles.edit.description')}
      </p>
    </div>
  )
}
