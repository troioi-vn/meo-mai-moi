import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import ApiTokensSettingsPage from '@/pages/settings/ApiTokensSettingsPage'
import { Wrench } from 'lucide-react'

export default function DeveloperPage() {
  const { t } = useTranslation(['settings', 'common'])

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">{t('common:nav.home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('developer.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
    </div>
  )
}
