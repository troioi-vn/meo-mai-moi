import React, { useMemo } from 'react'
import type { Pet } from '@/types/pet'
import { calculateAge } from '@/types/pet'
import { getStatusDisplay, getStatusClasses } from '@/utils/petStatus'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { deriveImageUrl } from '@/utils/petImages'
import { usePlacementInfo } from '@/hooks/usePlacementInfo'
import { PlacementRequestsSection } from '@/components/pet-profile/PlacementRequestsSection'
import { PlacementResponseSection } from '@/components/pet-profile/PlacementResponseSection'



interface PetDetailsProps {
  pet: Pet
  onDeletePlacementRequest: (id: number) => void | Promise<void>
  onCancelTransferRequest?: (id: number) => void | Promise<void>
  onTransferResponseSuccess?: () => void
  onOpenPlacementRequest?: () => void
}

const PetDetails: React.FC<PetDetailsProps> = ({
  pet,
  onDeletePlacementRequest,
  onCancelTransferRequest,
  onTransferResponseSuccess,
  onOpenPlacementRequest,
}) => {
  const age = calculateAge(pet.birthday)
  const statusDisplay = getStatusDisplay(pet.status)
  const statusClasses = getStatusClasses(pet.status)
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const imageUrl = useMemo(() => deriveImageUrl(pet), [pet])

  const placementInfo = usePlacementInfo(pet, user?.id)
  const { supportsPlacement, hasActivePlacementRequest, activePlacementRequest, myPendingTransfer } = placementInfo

  const placementRequests = pet.placement_requests ?? []
  const showPlacementRequests = supportsPlacement && placementRequests.length > 0
  const isDeceased = pet.status === 'deceased'

  const handleEditClick = () => {
    void navigate(`/pets/${String(pet.id)}/edit`)
  }

  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden">
      <div className="relative">
        <img
          src={imageUrl}
          alt={pet.name}
          className={`w-full h-64 object-cover ${isDeceased ? 'grayscale' : ''}`}
        />
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
            <div className="flex flex-wrap justify-end gap-2">
              {supportsPlacement && onOpenPlacementRequest && (
                <Button onClick={() => { onOpenPlacementRequest() }} variant="outline">
                  Placement Requests
                </Button>
              )}
              <Button onClick={() => { handleEditClick() }} variant="outline">
                Edit
              </Button>
            </div>
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
          {isAuthenticated &&
            user?.id !== pet.user_id &&
            supportsPlacement &&
            hasActivePlacementRequest &&
            activePlacementRequest && (
              <PlacementResponseSection
                pet={pet}
                activePlacementRequest={activePlacementRequest}
                myPendingTransfer={myPendingTransfer}
                onCancelTransferRequest={onCancelTransferRequest}
                onTransferResponseSuccess={onTransferResponseSuccess}
              />
            )}
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
export default PetDetails

