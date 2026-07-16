import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AppBreadcrumbs, PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function AccountPasswordPage() {
  const { t } = useTranslation('settings')

  return (
    <PageContainer width="narrow">
      <AppBreadcrumbs
        items={[
          { label: t('title'), to: '/settings/account' },
          { label: t('security.passwordTitle') },
        ]}
      />

      <PageHeader
        className="mb-6"
        title={t('security.changePassword.title')}
        description={t('security.changePassword.description')}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings/account" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('security.changePassword.backToSettings')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
