import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ApiTokensSettingsPage from '@/pages/settings/ApiTokensSettingsPage'
import { Wrench } from 'lucide-react'

export default function DeveloperPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6">
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link to="/settings/account" className="hover:text-foreground transition-colors">
          {t('title')}
        </Link>
        <span>/</span>
        <span className="text-foreground">{t('developer.title')}</span>
      </nav>

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
