import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlacementRequestDetail } from '@/types/placement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TimelineCardProps {
  request: PlacementRequestDetail
}

export function TimelineCard({ request }: TimelineCardProps) {
  const { t } = useTranslation('common')

  const steps = [
    {
      status: 'open',
      label: t('requestDetail.timelineStatus.open'),
      activeText: 'text-primary font-medium',
      activeDot: 'bg-primary',
    },
    {
      status: 'pending_transfer',
      label: t('requestDetail.timelineStatus.pendingTransfer'),
      activeText: 'text-primary font-medium',
      activeDot: 'bg-primary',
    },
    {
      status: 'active',
      label: t('requestDetail.timelineStatus.active'),
      activeText: 'text-primary font-medium',
      activeDot: 'bg-primary',
    },
    {
      status: 'finalized',
      label: t('requestDetail.timelineStatus.completed'),
      activeText: 'text-emerald-600 dark:text-emerald-400 font-medium',
      activeDot: 'bg-green-600',
    },
  ]

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('requestDetail.timeline')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
          {steps.map((step, index) => {
            const isActive = request.status === step.status

            return (
              <Fragment key={step.status}>
                {index > 0 && (
                  <div className="ml-[5px] h-3 w-px shrink-0 bg-border sm:ml-0 sm:h-px sm:w-auto sm:flex-1" />
                )}
                <div
                  className={`flex items-center gap-1.5 ${isActive ? step.activeText : 'text-muted-foreground'}`}
                >
                  <div
                    className={`h-3 w-3 shrink-0 rounded-full ${isActive ? step.activeDot : 'bg-muted-foreground'}`}
                  />
                  {step.label}
                </div>
              </Fragment>
            )
          })}
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          {t('requestDetail.created', { date: new Date(request.created_at).toLocaleDateString() })}
          {request.start_date &&
            ` • ${t('requestDetail.starts', { date: new Date(request.start_date).toLocaleDateString() })}`}
          {request.end_date &&
            ` • ${t('requestDetail.ends', { date: new Date(request.end_date).toLocaleDateString() })}`}
        </div>
      </CardContent>
    </Card>
  )
}
