import type { PlacementRequestDetail } from '@/types/placement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TimelineCardProps {
  request: PlacementRequestDetail
}

export function TimelineCard({ request }: TimelineCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`flex items-center gap-1 ${request.status === 'open' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${request.status === 'open' ? 'bg-primary' : 'bg-muted-foreground'}`}
            />
            Open
          </div>
          <div className="flex-1 h-px bg-border" />
          <div
            className={`flex items-center gap-1 ${request.status === 'pending_transfer' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${request.status === 'pending_transfer' ? 'bg-primary' : 'bg-muted-foreground'}`}
            />
            Pending Transfer
          </div>
          <div className="flex-1 h-px bg-border" />
          <div
            className={`flex items-center gap-1 ${request.status === 'active' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${request.status === 'active' ? 'bg-primary' : 'bg-muted-foreground'}`}
            />
            Active
          </div>
          <div className="flex-1 h-px bg-border" />
          <div
            className={`flex items-center gap-1 ${request.status === 'finalized' ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
          >
            <div
              className={`h-3 w-3 rounded-full ${request.status === 'finalized' ? 'bg-green-600' : 'bg-muted-foreground'}`}
            />
            Completed
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Created {new Date(request.created_at).toLocaleDateString()}
          {request.start_date && ` • Starts ${new Date(request.start_date).toLocaleDateString()}`}
          {request.end_date && ` • Ends ${new Date(request.end_date).toLocaleDateString()}`}
        </div>
      </CardContent>
    </Card>
  )
}
