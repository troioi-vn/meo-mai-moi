import React, { useState } from 'react'
import type { Pet } from '@/types/pet'
import { calculateAge, petSupportsCapability } from '@/types/pet'
import { getStatusDisplay, getStatusClasses } from '@/utils/petStatus'
// Using default avatar as placeholder for pets
import placeholderImage from '@/assets/images/default-avatar.webp'
import { Button } from '@/components/ui/button'
import { PlacementResponseModal } from '@/components/PlacementResponseModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'


interface PetDetailsProps {
  pet: Pet
  onDeletePlacementRequest: (id: number) => void
  onCancelTransferRequest?: (id: number) => void
  onTransferResponseSuccess?: () => void
}

export const PetDetails: React.FC<PetDetailsProps> = ({
  pet,
  onDeletePlacementRequest,
  onCancelTransferRequest,
  onTransferResponseSuccess,
}) => {
  const age = calculateAge(pet.birthday)
  const statusDisplay = getStatusDisplay(pet.status)
  const statusClasses = getStatusClasses(pet.status)
  const [isRespondOpen, setIsRespondOpen] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  
  // Check if this pet type supports placement requests
  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
  
  const anyActive = Boolean(
    pet.placement_requests?.some(
      (r) => r.is_active ?? (r.status === 'open' || r.status === 'pending_review')
    )
  )
  const hasActivePlacementRequest = pet.placement_request_active === true ? true : anyActive
  const activePlacementRequest =
    pet.placement_requests?.find((r) => r.is_active === true) ??
    pet.placement_requests?.find((r) => r.status === 'open' || r.status === 'pending_review')

  // Check if current user has a pending response
  const myPendingTransfer = React.useMemo(() => {
    if (!user?.id || !pet.placement_requests) return undefined
    for (const pr of pet.placement_requests) {
      const found = pr.transfer_requests?.find((tr) => {
        if (tr.status !== 'pending') return false
        if (tr.initiator_user_id && tr.initiator_user_id === user.id) return true
        return tr.helper_profile?.user?.id === user.id
      })
      if (found) return found
    }
    return undefined
  }, [pet.placement_requests, user?.id])

  // Prefer photos[0].url, then photo_url, then placeholder
  const imageUrl =
    (Array.isArray((pet as { photos?: { url?: string }[] }).photos)
      ? (pet as { photos?: { url?: string }[] }).photos?.[0]?.url
      : undefined) ??
    pet.photo_url ??
    placeholderImage

  const handleEditClick = () => {
    // Use unified pet edit route
    navigate(`/pets/${pet.id}/edit`)
  }

  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden">
      <div className="relative">
        <img src={imageUrl} alt={pet.name} className="w-full h-64 object-cover" />
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${statusClasses}`}>
          {statusDisplay}
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">{pet.name}</h1>
            <p className="text-lg text-muted-foreground">
              {pet.breed} • {age} years old
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                {pet.pet_type.name}
              </span>
            </div>
          </div>
          
          {pet.viewer_permissions?.can_edit && (
            <Button onClick={handleEditClick} variant="outline">
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-card-foreground">Location</h3>
            <p className="text-muted-foreground">{pet.location}</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-card-foreground">Description</h3>
            <p className="text-muted-foreground">{pet.description}</p>
          </div>

          {/* Placement Request Section - only show if pet type supports it */}
          {supportsPlacement && (
            <div>
              <h3 className="font-semibold text-card-foreground">Placement Requests</h3>
              {pet.placement_requests && pet.placement_requests.length > 0 ? (
                <div className="space-y-2">
                  {pet.placement_requests.map((request) => (
                    <div key={request.id} className="flex justify-between items-center p-3 bg-background rounded border">
                      <div>
                        <span className="font-medium">{request.request_type.replace('_', ' ').toUpperCase()}</span>
                        {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}
                      </div>
                      {pet.viewer_permissions?.can_edit && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Placement Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this placement request? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeletePlacementRequest(request.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No active placement requests</p>
              )}
            </div>
          )}

          {/* Response Section for non-owners */}
          {isAuthenticated &&
            user?.id !== pet.user_id &&
            supportsPlacement &&
            hasActivePlacementRequest &&
            activePlacementRequest && (
              <div className="border-t pt-4">
                {myPendingTransfer ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      You responded to this placement request. Waiting for approval...
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onCancelTransferRequest) {
                          onCancelTransferRequest(myPendingTransfer.id!)
                        }
                      }}
                    >
                      Cancel Response
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsRespondOpen(true)}
                    className="w-full"
                  >
                    Respond to Placement Request
                  </Button>
                )}
                
                <PlacementResponseModal
                  isOpen={isRespondOpen}
                  onClose={() => setIsRespondOpen(false)}
                  petName={pet.name}
                  petId={pet.id}
                  placementRequestId={activePlacementRequest.id}
                  onSuccess={onTransferResponseSuccess}
                />
              </div>
            )}

          {/* Feature availability notice for non-supporting pet types */}
          {!supportsPlacement && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground text-center">
                Placement requests are not available for {pet.pet_type.name.toLowerCase()}s at this time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

