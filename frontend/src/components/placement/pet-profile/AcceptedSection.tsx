import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TransferHandoverLite {
  id?: number | string
  status?: string
  scheduled_at?: string | number | Date | null
  location?: string | null
}

interface PlacementRequestLite {
  id: number
  request_type: string
  transfer_requests?: {
    id: number
    status?: string
    helper_profile?: { user?: { name?: string } }
  }[]
}

interface Props {
  placementRequest: PlacementRequestLite
  onSchedule: (id: number) => void
  hasHandover: (id: number) => boolean
  getHandover: (id: number) => TransferHandoverLite | undefined
}

export function AcceptedSection({ placementRequest, onSchedule, hasHandover, getHandover }: Props) {
  const accepted =
    placementRequest.transfer_requests?.filter((tr) => tr.status === 'accepted') ?? []
  if (accepted.length === 0) return null
  return (
    <div className="mb-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">
          Accepted for <span>{placementRequest.request_type.replace('_', ' ').toUpperCase()}</span>
        </h3>
      </div>
      <ul>
        {accepted.map((tr) => {
          const ho = getHandover(tr.id)
          const status = ho?.status
          const chip = status ? (
            <Badge
              variant={
                status === 'confirmed'
                  ? 'default'
                  : status === 'disputed'
                    ? 'destructive'
                    : status === 'canceled'
                      ? 'outline'
                      : 'secondary'
              }
            >
              {status.toUpperCase()}
            </Badge>
          ) : hasHandover(tr.id) ? (
            <Badge variant="secondary">PENDING</Badge>
          ) : null
          return (
            <li key={'acc-' + String(tr.id)} className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  {tr.helper_profile?.user?.name}
                  {chip}
                </span>
                {ho && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Meeting: {ho.scheduled_at ? new Date(ho.scheduled_at).toLocaleString() : 'TBD'}
                    {ho.location ? `, ${ho.location}` : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!hasHandover(tr.id) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onSchedule(tr.id)
                    }}
                  >
                    Schedule handover
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
