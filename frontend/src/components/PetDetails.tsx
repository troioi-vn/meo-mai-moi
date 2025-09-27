<<<<<<< HEAD
import React, { useState } from 'react'
import type { Pet } from '@/types/pet'
import { calculateAge, petSupportsCapability } from '@/types/pet'
import { getStatusDisplay, getStatusClasses } from '@/utils/petStatus'
// Using default avatar as placeholder for pets
=======
import React, { useCallback, useMemo, useState } from 'react'
import type { Pet } from '@/types/pet'
import { calculateAge, petSupportsCapability } from '@/types/pet'
import { getStatusDisplay, getStatusClasses } from '@/utils/petStatus'
>>>>>>> dev
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


<<<<<<< HEAD
=======
type PlacementRequest = NonNullable<Pet['placement_requests']>[number]
type TransferRequest = NonNullable<PlacementRequest['transfer_requests']>[number]

const deriveImageUrl = (pet: Pet): string => {
  const photos = (pet as { photos?: { url?: string }[] }).photos
  if (Array.isArray(photos)) {
    const photoUrl = photos[0]?.url
    if (photoUrl) return photoUrl
  }
  return pet.photo_url ?? placeholderImage
}

const isPlacementRequestActive = (request: PlacementRequest): boolean => {
  if (typeof request.is_active === 'boolean') {
    return request.is_active
  }
  return request.status === 'open' || request.status === 'pending_review'
}

const usePlacementInfo = (pet: Pet, userId?: number) => {
  return useMemo(() => {
    const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
    if (!supportsPlacement) {
      return {
        supportsPlacement,
        hasActivePlacementRequest: false,
        activePlacementRequest: undefined as PlacementRequest | undefined,
        myPendingTransfer: undefined as TransferRequest | undefined,
      }
    }

    const placementRequests = pet.placement_requests ?? []
    const activePlacementRequest =
      placementRequests.find((request) => isPlacementRequestActive(request)) ??
      placementRequests.find((request) => request.status === 'open' || request.status === 'pending_review')

    const hasActivePlacementRequest =
      pet.placement_request_active === true ||
      placementRequests.some((request) => isPlacementRequestActive(request))

    if (!userId || !placementRequests.length) {
      return { supportsPlacement, hasActivePlacementRequest, activePlacementRequest, myPendingTransfer: undefined }
    }

    const myPendingTransfer = placementRequests.reduce<TransferRequest | undefined>((found, request) => {
      if (found) return found
      return request.transfer_requests?.find((transfer) => {
        if (transfer.status !== 'pending') return false
        if (transfer.initiator_user_id && transfer.initiator_user_id === userId) return true
        return transfer.helper_profile?.user?.id === userId
      })
    }, undefined)

    return { supportsPlacement, hasActivePlacementRequest, activePlacementRequest, myPendingTransfer }
  }, [pet, userId])
}
interface PlacementRequestsSectionProps {
  placementRequests: PlacementRequest[]
  canEdit: boolean
  onDeletePlacementRequest: (id: number) => void | Promise<void>
}

const PlacementRequestsSection: React.FC<PlacementRequestsSectionProps> = ({
  placementRequests,
  canEdit,
  onDeletePlacementRequest,
}) => {
  const handleDelete = useCallback(
    async (requestId: number) => {
      try {
        await onDeletePlacementRequest(requestId)
      } catch (error) {
        console.error('Failed to delete placement request', error)
      }
    },
    [onDeletePlacementRequest]
  )

  if (!placementRequests.length) {
    return <p className="text-muted-foreground">No active placement requests</p>
  }

  return (
    <div className="space-y-2">
      {placementRequests.map((request) => (
        <div key={request.id} className="flex justify-between items-center p-3 bg-background rounded border">
          <div>
            <span className="font-medium">{request.request_type.replace('_', ' ').toUpperCase()}</span>
            {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}
          </div>
          {canEdit && (
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
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void handleDelete(request.id)}
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
  )
}

interface PlacementResponseSectionProps {
  pet: Pet
  activePlacementRequest: PlacementRequest
  myPendingTransfer?: TransferRequest
  onCancelTransferRequest?: (id: number) => void | Promise<void>
  onTransferResponseSuccess?: () => void
}

const PlacementResponseSection: React.FC<PlacementResponseSectionProps> = ({
  pet,
  activePlacementRequest,
  myPendingTransfer,
  onCancelTransferRequest,
  onTransferResponseSuccess,
}) => {
  const [isRespondOpen, setIsRespondOpen] = useState(false)

  const handleCancel = useCallback(async () => {
    if (!myPendingTransfer || !onCancelTransferRequest) return
    try {
      await onCancelTransferRequest(myPendingTransfer.id)
    } catch (error) {
      console.error('Failed to cancel transfer request', error)
    }
  }, [myPendingTransfer, onCancelTransferRequest])

  return (
    <div className="border-t pt-4">
      {myPendingTransfer ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You responded to this placement request. Waiting for approval...
          </p>
          <Button variant="outline" size="sm" onClick={() => void handleCancel()}>
            Cancel Response
          </Button>
        </div>
      ) : (
        <Button onClick={() => setIsRespondOpen(true)} className="w-full">
          Respond to Placement Request
        </Button>
      )}

      <PlacementResponseModal
        isOpen={isRespondOpen}
        onClose={() => {
          setIsRespondOpen(false)
        }}
        petName={pet.name}
        petId={pet.id}
        placementRequestId={activePlacementRequest.id}
        onSuccess={onTransferResponseSuccess}
      />
    </div>
  )
}

>>>>>>> dev
interface PetDetailsProps {
  pet: Pet
  onDeletePlacementRequest: (id: number) => void | Promise<void>
  onCancelTransferRequest?: (id: number) => void | Promise<void>
  onTransferResponseSuccess?: () => void
<<<<<<< HEAD
}

export const PetDetails: React.FC<PetDetailsProps> = ({
=======
  onOpenPlacementRequest?: () => void
}

const PetDetails: React.FC<PetDetailsProps> = ({
>>>>>>> dev
  pet,
  onDeletePlacementRequest,
  onCancelTransferRequest,
  onTransferResponseSuccess,
<<<<<<< HEAD
=======
  onOpenPlacementRequest,
>>>>>>> dev
}) => {
  const age = calculateAge(pet.birthday)
  const statusDisplay = getStatusDisplay(pet.status)
  const statusClasses = getStatusClasses(pet.status)
<<<<<<< HEAD
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
=======
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const imageUrl = useMemo(() => deriveImageUrl(pet), [pet])

  const { supportsPlacement, hasActivePlacementRequest, activePlacementRequest, myPendingTransfer } =
    usePlacementInfo(pet, user?.id)

  const placementRequests = pet.placement_requests ?? []
  const showPlacementRequests = supportsPlacement && placementRequests.length > 0
  const isDeceased = pet.status === 'deceased'

  const handleEditClick = () => {
>>>>>>> dev
    navigate(`/pets/${String(pet.id)}/edit`)
  }

  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden">
      <div className="relative">
<<<<<<< HEAD
        <img src={imageUrl} alt={pet.name} className="w-full h-64 object-cover" />
=======
        <img
          src={imageUrl}
          alt={pet.name}
          className={`w-full h-64 object-cover ${isDeceased ? 'grayscale' : ''}`}
        />
>>>>>>> dev
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${statusClasses}`}>
          {statusDisplay}
        </div>
      </div>
<<<<<<< HEAD
      
=======

>>>>>>> dev
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
<<<<<<< HEAD
          
          {pet.viewer_permissions?.can_edit && (
            <Button onClick={handleEditClick} variant="outline">
              Edit
            </Button>
=======

          {pet.viewer_permissions?.can_edit && (
            <div className="flex flex-wrap justify-end gap-2">
              {supportsPlacement && onOpenPlacementRequest && (
                <Button onClick={onOpenPlacementRequest} variant="outline">
                  Placement Requests
                </Button>
              )}
              <Button onClick={handleEditClick} variant="outline">
                Edit
              </Button>
            </div>
>>>>>>> dev
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-card-foreground">Location</h3>
            <p className="text-muted-foreground">{pet.location}</p>
          </div>
<<<<<<< HEAD
          
=======

>>>>>>> dev
          <div>
            <h3 className="font-semibold text-card-foreground">Description</h3>
            <p className="text-muted-foreground">{pet.description}</p>
          </div>

<<<<<<< HEAD
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
                                onClick={() => {
                                  const run = async () => {
                                    await onDeletePlacementRequest(request.id)
                                  }
                                  run().catch((error: unknown) => {
                                    console.error('Failed to delete placement request', error)
                                  })
                                }}
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
=======
          {showPlacementRequests && (
            <div>
              <h3 className="font-semibold text-card-foreground">Placement Requests</h3>
              <PlacementRequestsSection
                placementRequests={placementRequests}
                canEdit={Boolean(pet.viewer_permissions?.can_edit)}
                onDeletePlacementRequest={onDeletePlacementRequest}
              />
            </div>
          )}

>>>>>>> dev
          {isAuthenticated &&
            user?.id !== pet.user_id &&
            supportsPlacement &&
            hasActivePlacementRequest &&
            activePlacementRequest && (
<<<<<<< HEAD
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
                            const run = async () => {
                              await onCancelTransferRequest(myPendingTransfer.id)
                            }
                            run().catch((error: unknown) => {
                              console.error('Failed to cancel transfer request', error)
                            })
                          }
                        }}
                      >
                      Cancel Response
                    </Button>
                  </div>
                ) : (
                    <Button
                      onClick={() => {
                        setIsRespondOpen(true)
                      }}
                      className="w-full"
                    >
                    Respond to Placement Request
                  </Button>
                )}
                
                  <PlacementResponseModal
                    isOpen={isRespondOpen}
                    onClose={() => {
                      setIsRespondOpen(false)
                    }}
                    petName={pet.name}
                    petId={pet.id}
                    placementRequestId={activePlacementRequest.id}
                    onSuccess={onTransferResponseSuccess}
                  />
              </div>
            )}

          {/* Feature availability notice for non-supporting pet types */}
=======
              <PlacementResponseSection
                pet={pet}
                activePlacementRequest={activePlacementRequest}
                myPendingTransfer={myPendingTransfer}
                onCancelTransferRequest={onCancelTransferRequest}
                onTransferResponseSuccess={onTransferResponseSuccess}
              />
            )}

>>>>>>> dev
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

<<<<<<< HEAD
=======
export default PetDetails

>>>>>>> dev
