import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNetworkStatus } from '@/hooks/use-network-status'

export function OfflineBadge() {
  const { t } = useTranslation('common')
  const isOnline = useNetworkStatus()

  if (isOnline) return null

  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1
      text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200
      animate-in fade-in slide-in-from-top-1"
    >
      <WifiOff className="size-3.5" />
      <span>{t('status.offline')}</span>
    </div>
  )
}
