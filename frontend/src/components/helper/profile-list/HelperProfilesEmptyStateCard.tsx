import { useTranslation } from 'react-i18next'
import { Home, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'

export function HelperProfilesEmptyStateCard({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation('common')
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Home />
        </EmptyMedia>
        <EmptyTitle>{t('helperProfiles.noProfiles')}</EmptyTitle>
        <EmptyDescription>{t('helperProfiles.noProfilesHint')}</EmptyDescription>
      </EmptyHeader>
      <Button onClick={onCreate}>
        <PlusCircle className="mr-2 h-4 w-4" />
        {t('helperProfiles.createFirst')}
      </Button>
    </Empty>
  )
}
