import type { PlacementRequestDetail } from '@/types/placement'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponseCard } from './ResponseCard'

interface OwnerResponsesSectionProps {
  request: PlacementRequestDetail
  actionLoading: string | null
  creatingChat: boolean
  onAccept: (id: number) => Promise<void>
  onReject: (id: number) => Promise<void>
  onChat: (userId: number) => Promise<void>
}

export function OwnerResponsesSection({
  request,
  actionLoading,
  creatingChat,
  onAccept,
  onReject,
  onChat,
}: OwnerResponsesSectionProps) {
  if (request.status !== 'open') return null

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Responses</span>
          <Badge variant="secondary">{request.response_count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {request.responses && request.responses.length > 0 ? (
          <div className="space-y-4">
            {request.responses
              .filter((r) => r.status === 'responded')
              .map((response) => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  placementRequestId={request.id}
                  requestType={request.request_type}
                  onAccept={onAccept}
                  onReject={onReject}
                  onChat={onChat}
                  actionLoading={actionLoading}
                  creatingChat={creatingChat}
                />
              ))}

            {request.responses.filter((r) => r.status === 'responded').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending responses yet.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No responses yet. Helpers will appear here when they respond.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
