import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
// toast handled inside hook
import { usePlacementResponse } from '@/hooks/usePlacementResponse'
import { PlacementResponseForm } from '@/components/pet-profile/PlacementResponseForm'
import { PlacementResponseConfirm } from '@/components/pet-profile/PlacementResponseConfirm'

interface PlacementResponseModalProps {
  isOpen: boolean
  onClose: () => void
  petName: string
  petId: number
  placementRequestId: number
  onSuccess?: () => void
}

export const PlacementResponseModal: React.FC<PlacementResponseModalProps> = ({
  isOpen,
  onClose,
  petName,
  petId,
  placementRequestId,
  onSuccess,
}) => {
  const {
    actualPetName,
    helperProfiles,
    loading,
    selectedProfile,
    setSelectedProfile,
    requestedRelationshipType,
    setRequestedRelationshipType,
    fosteringType,
    setFosteringType,
    price,
    setPrice,
    showConfirmation,
    submitting,
    handleInitialSubmit,
    handleConfirmSubmit,
  } = usePlacementResponse({
    isOpen,
    petName,
    petId,
    placementRequestId,
    onSuccess,
    onClose,
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Respond to Placement Request for {actualPetName}</DialogTitle>
          <DialogDescription>
            Select your helper profile and the relationship type to respond. You can confirm before
            submitting.
          </DialogDescription>
        </DialogHeader>
        {!showConfirmation ? (
          <PlacementResponseForm
            loading={loading}
            helperProfiles={helperProfiles}
            selectedProfile={selectedProfile}
            setSelectedProfile={setSelectedProfile}
            requestedRelationshipType={requestedRelationshipType}
            setRequestedRelationshipType={setRequestedRelationshipType}
            fosteringType={fosteringType}
            setFosteringType={setFosteringType}
            price={price}
            setPrice={setPrice}
            onCreateHelperProfile={() => {
              window.location.href = '/helper/create'
            }}
          />
        ) : (
          <PlacementResponseConfirm
            petName={actualPetName}
            helperProfiles={helperProfiles}
            selectedProfile={selectedProfile}
            requestedRelationshipType={requestedRelationshipType}
            fosteringType={fosteringType}
            price={price}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {!showConfirmation ? (
            <Button
              onClick={handleInitialSubmit}
              disabled={
                (selectedProfile ?? '') === '' ||
                (requestedRelationshipType ?? '') === '' ||
                submitting
              }
            >
              Submit
            </Button>
          ) : (
            <Button
              onClick={() => {
                void handleConfirmSubmit()
              }}
              disabled={submitting}
            >
              Confirm Submission
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
