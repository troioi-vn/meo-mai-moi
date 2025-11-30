import { Badge } from '@/components/ui/badge'
import type { VaccinationStatus } from '@/utils/vaccinationStatus'
import { cn } from '@/lib/utils'

interface VaccinationStatusBadgeProps {
  status: VaccinationStatus
  className?: string
}

const statusConfig: Record<
  VaccinationStatus,
  { label: string; className: string }
> = {
  up_to_date: {
    label: 'Up to date',
    className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  due_soon: {
    label: 'Due soon',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  unknown: {
    label: 'No records',
    className: 'bg-muted text-muted-foreground hover:bg-muted',
  },
}

export function VaccinationStatusBadge({ status, className }: VaccinationStatusBadgeProps) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const config = statusConfig[status] as { label: string; className: string }

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}

