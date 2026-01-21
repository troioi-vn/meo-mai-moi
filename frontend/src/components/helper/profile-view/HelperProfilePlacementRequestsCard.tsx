import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlacementResponseStatusLabels, type PlacementResponseStatus } from '@/types/placement'
import type { HelperProfile } from '@/types/helper-profile'

const formatLabel = (value: string, fallback = 'Unknown') =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : fallback

export function HelperProfilePlacementRequestsCard({ profile }: { profile: HelperProfile }) {
  const placementResponses = profile.placement_responses ?? []

  const placementRequests = placementResponses
    .map((response) => {
      const placementRequest = response.placement_request
      if (!placementRequest) return null
      const placementRequestId = placementRequest.id
      if (!placementRequestId) return null

      const responsePet = response.pet ?? placementRequest.pet
      if (!responsePet) return null
      const petName = responsePet.name
      const placementRequestOwnerName: string | undefined = (
        placementRequest as { owner?: { name?: string } }
      ).owner?.name
      const placementRequestUserName: string | undefined = (
        placementRequest as { user?: { name?: string } }
      ).user?.name
      const responsePetUserName: string | undefined = (responsePet as { user?: { name?: string } })
        .user?.name
      const ownerName =
        placementRequestOwnerName ?? placementRequestUserName ?? responsePetUserName ?? 'Unknown'

      const placementRequestStatus = placementRequest.status
      const ownerUserId = placementRequest.user_id
      const helperUserId = profile.user_id
      const transferRequests = Array.isArray(placementRequest.transfer_requests)
        ? placementRequest.transfer_requests
        : []

      const isActionRequired =
        placementRequestStatus === 'pending_transfer' &&
        Boolean(ownerUserId) &&
        Boolean(helperUserId) &&
        transferRequests.some(
          (t) =>
            t.status === 'pending' &&
            t.from_user_id === ownerUserId &&
            t.to_user_id === helperUserId
        )

      return {
        id: placementRequestId,
        ownerName,
        petName,
        respondedAt: response.responded_at,
        status: response.status,
        isActionRequired,
      }
    })
    .filter(
      (
        item
      ): item is {
        id: number
        ownerName: string
        petName: string
        respondedAt: string
        status: PlacementResponseStatus
        isActionRequired: boolean
      } => Boolean(item)
    )
    .sort((a, b) => {
      const aTime = a.respondedAt ? new Date(a.respondedAt).getTime() : 0
      const bTime = b.respondedAt ? new Date(b.respondedAt).getTime() : 0
      return bTime - aTime
    }) as {
    id: number
    ownerName: string
    petName: string
    respondedAt: string
    status: PlacementResponseStatus
    isActionRequired: boolean
  }[]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Placement Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {placementRequests.length === 0 && (
          <p className="text-sm text-muted-foreground">No placement requests yet.</p>
        )}
        {placementRequests.map((item) => (
          <Link
            key={item.id}
            to={`/requests/${String(item.id)}`}
            aria-label={`Open placement request ${String(item.id)} for ${item.petName}`}
            className="block rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Owner
                    </p>
                    <p className="text-sm font-medium truncate">{item.ownerName}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Pet
                    </p>
                    <p className="text-sm font-medium truncate">{item.petName}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Responded
                    </p>
                    <p className="text-sm font-medium">
                      {item.respondedAt
                        ? new Date(item.respondedAt).toLocaleDateString('en-US')
                        : '—'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {PlacementResponseStatusLabels[item.status] ?? formatLabel(item.status)}
                      </Badge>
                      <Badge
                        className={
                          item.isActionRequired
                            ? 'bg-amber-500 text-white hover:bg-amber-500'
                            : 'bg-muted text-foreground hover:bg-muted'
                        }
                      >
                        {item.isActionRequired ? 'Action required' : 'Waiting'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
