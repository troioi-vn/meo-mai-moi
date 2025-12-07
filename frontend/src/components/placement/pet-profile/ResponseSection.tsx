import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Eye } from 'lucide-react'
import type { TransferRequest, PlacementRequest as PlacementRequestType } from '@/types/pet'

interface Props {
  placementRequest: PlacementRequestType
  onViewProfile: (tr: TransferRequest) => void
  onConfirm: (id: number) => void
  onReject: (id: number) => void
}

const formatRequestType = (type: string): string => {
  const labels: Record<string, string> = {
    foster_free: 'Foster (Free)',
    foster_payed: 'Foster (Paid)',
    permanent: 'Permanent Adoption',
  }
  return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ResponseSection({ placementRequest, onViewProfile, onConfirm, onReject }: Props) {
  const pendingTransfers =
    placementRequest.transfer_requests?.filter((tr) => tr.status === 'pending') ?? []
  if (pendingTransfers.length === 0) return null

  return (
    <div className="rounded-lg border p-4 bg-muted/50 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Responses for{' '}
          <Badge variant="secondary" className="ml-1">
            {formatRequestType(placementRequest.request_type)}
          </Badge>
        </h3>
      </div>
      <ul className="space-y-3">
        {pendingTransfers.map((transferRequest) => (
          <li
            key={String(transferRequest.id)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-background border"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-medium">
                {transferRequest.helper_profile?.user?.name ?? 'Unknown Helper'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onViewProfile(transferRequest)
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Profile
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onConfirm(transferRequest.id)
                }}
              >
                Confirm
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onReject(transferRequest.id)
                }}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
