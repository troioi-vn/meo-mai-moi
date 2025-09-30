import { Button } from '@/components/ui/button'
import type { TransferRequest, PlacementRequest as PlacementRequestType } from '@/types/pet'

type Props = {
  placementRequest: PlacementRequestType
  onViewProfile: (tr: TransferRequest) => void
  onConfirm: (id: number) => void
  onReject: (id: number) => void
}

export function ResponseSection({ placementRequest, onViewProfile, onConfirm, onReject }: Props) {
  const pendingTransfers =
    placementRequest.transfer_requests?.filter((tr) => tr.status === 'pending') ?? []
  if (pendingTransfers.length === 0) return null
  return (
    <div className="mb-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">
          Responses for <span>{placementRequest.request_type.replace('_', ' ').toUpperCase()}</span>
        </h3>
      </div>
      <ul>
        {pendingTransfers.map((transferRequest) => (
          <li key={String(transferRequest.id)} className="flex justify-between items-center">
            <span>{transferRequest.helper_profile?.user?.name}</span>
            <div>
              <Button
                variant="secondary"
                size="sm"
                className="mr-2"
                onClick={() => {
                  onViewProfile(transferRequest)
                }}
              >
                View helper profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="mr-2"
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
