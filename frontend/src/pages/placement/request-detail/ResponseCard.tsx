import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ChevronRight, Loader2, MessageCircle, User, X } from 'lucide-react'
import type { PlacementRequestResponse } from '@/types/placement'
import { Button } from '@/components/ui/button'
import { ResponsesDrawer } from '@/components/placement/pet-profile/ResponsesDrawer'

export interface ResponseCardProps {
  response: PlacementRequestResponse
  placementRequestId: number
  requestType: string
  onAccept: (id: number) => Promise<void>
  onReject: (id: number) => Promise<void>
  onChat: (userId: number) => Promise<void>
  actionLoading: string | null
  creatingChat: boolean
}

export function ResponseCard({
  response,
  placementRequestId,
  requestType,
  onAccept,
  onReject,
  onChat,
  actionLoading,
  creatingChat,
}: ResponseCardProps) {
  const { t } = useTranslation('common')
  const helperName = response.helper_profile?.user?.name ?? t('requestDetail.unknownHelper')
  const helperUserId = response.helper_profile?.user?.id
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <button
              type="button"
              className="font-medium text-left hover:underline inline-flex items-center gap-1"
              onClick={() => {
                setDrawerOpen(true)
              }}
            >
              {helperName}
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </button>
            {response.helper_profile?.city && (
              <p className="text-xs text-muted-foreground">{response.helper_profile.city}</p>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(response.responded_at).toLocaleDateString()}
        </span>
      </div>

      {response.message && (
        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{response.message}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => void onAccept(response.id)}
          disabled={actionLoading === `accept-${String(response.id)}`}
          className="flex-1"
        >
          {actionLoading === `accept-${String(response.id)}` ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          {t('requestDetail.accept')}
        </Button>
        <Button
          variant="outline"
          onClick={() => void onReject(response.id)}
          disabled={actionLoading === `reject-${String(response.id)}`}
          className="flex-1"
        >
          {actionLoading === `reject-${String(response.id)}` ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          {t('requestDetail.reject')}
        </Button>
        {helperUserId && (
          <Button
            variant="outline"
            onClick={() => void onChat(helperUserId)}
            disabled={creatingChat}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ResponsesDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        responses={[response]}
        requestType={requestType}
        placementRequestId={placementRequestId}
        onAccept={onAccept}
        onReject={onReject}
        openProfileOnOpen={true}
        showDecisionActions={false}
      />
    </div>
  )
}
