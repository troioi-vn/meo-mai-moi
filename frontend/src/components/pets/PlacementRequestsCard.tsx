import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlacementRequestModal } from '@/components/placement/PlacementRequestModal'
import { formatRequestType, formatStatus } from '@/types/placement'
import type { PlacementRequest } from '@/types/pet'

interface PlacementRequestsCardProps {
  petId: number
  placementRequests: PlacementRequest[]
  canEdit: boolean
  onSuccess: () => void
}

const getRequestTypeBadgeVariant = (
  type: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (type === 'permanent') return 'default'
  if (type.includes('foster')) return 'secondary'
  return 'outline'
}

const getStatusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'open':
      return 'default'
    case 'pending_transfer':
      return 'secondary'
    case 'active':
    case 'finalized':
      return 'outline'
    case 'expired':
    case 'cancelled':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function PlacementRequestsCard({
  petId,
  placementRequests,
  canEdit,
  onSuccess,
}: PlacementRequestsCardProps) {
  const { t } = useTranslation(['pets'])
  const [modalOpen, setModalOpen] = useState(false)

  const sorted = [...placementRequests].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {t('pets:placementRequests.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              {t('pets:placementRequests.none')}
            </p>
          )}

          {sorted.map((request) => (
            <Link
              key={request.id}
              to={`/requests/${String(request.id)}`}
              aria-label={`Open placement request ${String(request.id)}`}
              className="block rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('pets:placementRequests.type')}
                      </p>
                      <div className="mt-1">
                        <Badge
                          variant={getRequestTypeBadgeVariant(request.request_type)}
                          className="w-fit"
                        >
                          {formatRequestType(request.request_type)}
                        </Badge>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('pets:placementRequests.created')}
                      </p>
                      <p className="text-sm font-medium">
                        {request.created_at
                          ? new Date(request.created_at).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('pets:placementRequests.status')}
                      </p>
                      <div className="mt-1">
                        <Badge
                          variant={getStatusBadgeVariant(request.status)}
                          className="w-fit"
                        >
                          {formatStatus(request.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}

          {canEdit && (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setModalOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('pets:placementRequests.add')}
            </Button>
          )}
        </CardContent>
      </Card>

      <PlacementRequestModal
        petId={petId}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
        }}
        onSuccess={onSuccess}
      />
    </>
  )
}
