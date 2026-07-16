import { useTranslation } from 'react-i18next'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppBreadcrumbs, PageContainer } from '@/components/layout/PageLayout'
import ApiTokensSettingsPage from '@/pages/settings/ApiTokensSettingsPage'
import { Wrench } from 'lucide-react'

export default function DeveloperPage() {
  const { t } = useTranslation(['settings', 'common'])

  return (
    <PageContainer width="narrow" className="space-y-6 py-6 md:py-10">
      <AppBreadcrumbs
        className="mb-0"
        items={[{ label: t('common:nav.home'), to: '/' }, { label: t('developer.title') }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t('developer.title')}
          </CardTitle>
          <CardDescription>{t('developer.description')}</CardDescription>
        </CardHeader>
      </Card>

      <ApiTokensSettingsPage />
    </PageContainer>
  )
}
