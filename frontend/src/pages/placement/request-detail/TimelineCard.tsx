import { useTranslation } from 'react-i18next'
import type { PlacementRequestDetail } from '@/types/placement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TimelineCardProps {
  request: PlacementRequestDetail
}

export function TimelineCard({ request }: TimelineCardProps) {
  const { t } = useTranslation('common')

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('requestDetail.timeline')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`flex items-center gap-1 ${request.status === 'open' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${request.status === 'open' ? 'bg-primary' : 'bg-muted-foreground'}`}
            />
            {t('requestDetail.timelineStatus.open')}
          </div>
          <div className="flex-1 h-px bg-border" />
          <div
            className={`flex items-center gap-1 ${request.status === 'pending_transfer' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${request.status === 'pending_transfer' ? 'bg-primary' : 'bg-muted-foreground'}`}
            />
            {t('requestDetail.timelineStatus.pendingTransfer')}
          </div>
          <div className="flex-1 h-px bg-border" />
          <div
            className={`flex items-center gap-1 ${request.status === 'active' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${request.status === 'active' ? 'bg-primary' : 'bg-muted-foreground'}`}
            />
            {t('requestDetail.timelineStatus.active')}
          </div>
          <div className="flex-1 h-px bg-border" />
          <div
            className={`flex items-center gap-1 ${request.status === 'finalized' ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${request.status === 'finalized' ? 'bg-green-600' : 'bg-muted-foreground'}`}
            />
            {t('requestDetail.timelineStatus.completed')}
          </div>
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
