import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { Ban } from 'lucide-react'

export function BannedReadOnlyBanner() {
  const { t } = useTranslation('common')
  const { user } = useAuth()

  if (!user?.is_banned) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
      <div className="container px-3 sm:px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Alert className="pointer-events-auto border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400">
          <Ban className="h-4 w-4" />
          <AlertTitle>{t('banned.title')}</AlertTitle>
          <AlertDescription>
            {t('banned.description')}
            {user.ban_reason ? ` ${t('banned.reason', { reason: user.ban_reason })}` : ''}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
