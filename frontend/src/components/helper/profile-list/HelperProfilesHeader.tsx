import { useTranslation } from 'react-i18next'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HelperProfilesHeader({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-foreground">{t('helperProfiles.title')}</h1>
      <Button onClick={onCreate}>
        <PlusCircle className="mr-2 h-4 w-4" />
        {t('helperProfiles.create')}
      </Button>
    </div>
  )
}
