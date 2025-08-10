import React, { useState } from 'react'
import type { Cat } from '@/types/cat'
import { calculateAge } from '@/types/cat'
import { getStatusDisplay, getStatusClasses } from '@/utils/catStatus'
import placeholderImage from '@/assets/images/placeholder--cat.webp'
import { Button } from '@/components/ui/button'
import { PlacementResponseModal } from '@/components/PlacementResponseModal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/use-auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface CatDetailsProps {
  cat: Cat
  onDeletePlacementRequest: (id: number) => void
  onCancelTransferRequest?: (id: number) => void
  onTransferResponseSuccess?: () => void
}

export const CatDetails: React.FC<CatDetailsProps> = ({ cat, onDeletePlacementRequest, onCancelTransferRequest, onTransferResponseSuccess }) => {
  const age = calculateAge(cat.birthday)
  const statusDisplay = getStatusDisplay(cat.status)
  const statusClasses = getStatusClasses(cat.status)
  const [isRespondOpen, setIsRespondOpen] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const anyActive = Boolean(cat.placement_requests?.some((r) => r.is_active || r.status === 'open' || r.status === 'pending_review'))
  const hasActivePlacementRequest = (cat.placement_request_active === true) ? true : anyActive
  const activePlacementRequest = (
  cat.placement_requests?.find((r) => r.is_active) ??
  cat.placement_requests?.find((r) => (r.status === 'open' || r.status === 'pending_review')) ??
    cat.placement_requests?.[0]
  )
  const activePlacementRequestId = activePlacementRequest?.id
  const myPendingTransfer = (() => {
    if (!user?.id || !cat.placement_requests) return undefined
    for (const pr of cat.placement_requests) {
      const found = pr.transfer_requests?.find((tr) => {
        if (tr.status !== 'pending') return false
        if (tr.initiator_user_id && tr.initiator_user_id === user.id) return true
        return tr.helper_profile?.user?.id === user.id
      })
      if (found) return found
    }
    return undefined
  })()

  const handleRespondClick = () => {
    if (!isAuthenticated) {
      toast.info('Please log in to respond to this placement request.')
      const redirect = encodeURIComponent(location.pathname)
      navigate(`/login?redirect=${redirect}`)
      return
    }
    setIsRespondOpen(true)
  }

  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden">
      <div className="md:flex">
        {/* Cat Image */}
        <div className="md:w-1/2">
          <img
            src={cat.photo_url ?? placeholderImage}
            alt={cat.name}
            className="w-full h-64 md:h-full object-cover"
          />
        </div>

        {/* Cat Information */}
        <div className="md:w-1/2 p-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-card-foreground mb-2">{cat.name}</h1>
              <p className="text-lg text-muted-foreground">
                {cat.breed} - {age} years old
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-card-foreground">Location</h3>
                <p className="text-muted-foreground">{cat.location}</p>
              </div>

              <div>
                <h3 className="font-semibold text-card-foreground">Status</h3>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusClasses}`}
                >
                  {statusDisplay}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-card-foreground">About {cat.name}</h3>
                <p className="text-muted-foreground leading-relaxed">{cat.description}</p>
              </div>

              {cat.placement_requests && cat.placement_requests.length > 0 && (
                <div>
                  <h3 className="font-semibold text-card-foreground">Active Placement Requests</h3>
                  <div className="mt-2 space-y-4">
                    {cat.placement_requests.map((request) => (
                      <div key={request.id} className="p-4 bg-muted rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-sm text-muted-foreground">
                            {request.request_type.replace('_', ' ').toUpperCase()} - <span className="font-normal">Expires: {request.expires_at ? new Date(request.expires_at).toLocaleDateString() : 'N/A'}</span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{request.notes}</p>
                        </div>
                        {cat.viewer_permissions?.can_edit && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this placement request.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { onDeletePlacementRequest(request.id); }}>Continue</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))}
                    {/* Non-owners can respond to active requests (publicly visible) */}
                    {hasActivePlacementRequest && !cat.viewer_permissions?.can_edit && activePlacementRequestId && (
                      <div className="pt-2">
                        {myPendingTransfer ? (
                          <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">
                              You responded to this request with this Helper Profile: {myPendingTransfer.helper_profile?.city ?? 'Unknown City'}, waiting for the cat's owner's approval.
                            </p>
                            <div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">Cancel Response</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel your response?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will withdraw your response to this placement request. You can respond again later while the request remains open.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep Response</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        const id = myPendingTransfer.id
                                        if (id) {
                                          if (typeof onCancelTransferRequest === 'function') {
                                            onCancelTransferRequest(id)
                                          } else {
                                            toast.info('Cancel action is not available here.')
                                          }
                                        }
                                      }}
                                    >
                                      Yes, Cancel
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Button onClick={() => { handleRespondClick() }} disabled={!!myPendingTransfer}>Respond</Button>
                            <PlacementResponseModal
                              isOpen={isRespondOpen}
                              onClose={() => { setIsRespondOpen(false); }}
                              catName={cat.name}
                              catId={cat.id}
                              placementRequestId={activePlacementRequestId}
                              onSuccess={() => {
                                // Refresh the parent page so pending response shows, then close modal
                                if (typeof onTransferResponseSuccess === 'function') {
                                  onTransferResponseSuccess()
                                }
                                setIsRespondOpen(false)
                              }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
