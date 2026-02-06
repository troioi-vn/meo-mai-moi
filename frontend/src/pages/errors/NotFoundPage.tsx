import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4">
      <h1 className="text-9xl font-bold text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-foreground">{t('notFound.title')}</h2>
      <p className="mt-2 text-muted-foreground">{t('notFound.description')}</p>
      <Button asChild className="mt-6">
        <Link to="/">{t('notFound.goHome')}</Link>
      </Button>
    </div>
  )
}
