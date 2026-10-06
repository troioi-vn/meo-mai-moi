import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { VaccinationStatus } from '@/utils/vaccinationStatus'
import { cn } from '@/lib/utils'

interface VaccinationStatusBadgeProps {
  status: VaccinationStatus
  className?: string
  contextual?: boolean
}

const statusConfig: Record<VaccinationStatus, { className: string }> = {
  up_to_date: {
    className:
      'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  due_soon: {
    className:
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  overdue: {
    className: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  unknown: {
    className: 'bg-muted text-muted-foreground hover:bg-muted',
  },
}

export function VaccinationStatusBadge({
  status,
  className,
  contextual = false,
}: VaccinationStatusBadgeProps) {
  const { t } = useTranslation('pets')
  const config = statusConfig[status]

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {contextual ? t(`profile.status.${status}`) : t(`profile.compactStatus.${status}`)}
    </Badge>
  )
}
