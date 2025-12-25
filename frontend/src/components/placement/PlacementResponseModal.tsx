import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
// toast handled inside hook
import { usePlacementResponse } from '@/hooks/usePlacementResponse'
import { PlacementResponseForm } from '@/components/placement/pet-profile/PlacementResponseForm'
import { PlacementResponseConfirm } from '@/components/placement/pet-profile/PlacementResponseConfirm'

interface PlacementResponseModalProps {
  isOpen: boolean
  onClose: () => void
  petName: string
  petId: number
  placementRequestId: number
  requestType: string
  petCity?: string | null
  petCountry?: string | null
  onSuccess?: () => void
}

export const PlacementResponseModal: React.FC<PlacementResponseModalProps> = ({
  isOpen,
  onClose,
  petName,
  petId,
  placementRequestId,
  requestType,
  petCity,
  petCountry,
  onSuccess,
}) => {
  const navigate = useNavigate()
  const {
    actualPetName,
    helperProfiles,
    loading,
    selectedProfile,
    setSelectedProfile,
    requestedRelationshipType,
    fosteringType,
    setFosteringType,
    price,
    setPrice,
    showConfirmation,
    submitting,
    handleInitialSubmit,
    handleConfirmSubmit,
    requestTypeWarning,
    cityWarning,
    countryWarning,
    canSubmit,
  } = usePlacementResponse({
    isOpen,
    petName,
    petId,
    placementRequestId,
    requestType,
    petCity: petCity ?? undefined,
    petCountry: petCountry ?? undefined,
    onSuccess,
    onClose,
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Respond to Placement Request for {actualPetName}</DialogTitle>
          <DialogDescription>
            {helperProfiles.length === 0 && !loading
              ? 'You need a helper profile to respond to this request.'
              : 'Select your helper profile to respond. You can confirm before submitting.'}
          </DialogDescription>
        </DialogHeader>
        {!showConfirmation ? (
          <PlacementResponseForm
            loading={loading}
            helperProfiles={helperProfiles}
            selectedProfile={selectedProfile}
            setSelectedProfile={setSelectedProfile}
            requestedRelationshipType={requestedRelationshipType}
            fosteringType={fosteringType}
            setFosteringType={setFosteringType}
            price={price}
            setPrice={setPrice}
            requestTypeWarning={requestTypeWarning}
            cityWarning={cityWarning}
            countryWarning={countryWarning}
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
          {helperProfiles.length === 0 && !loading ? (
            <Button
              onClick={() => {
                navigate('/helper/create')
              }}
            >
              Create Helper Profile
            </Button>
          ) : !showConfirmation ? (
            <Button onClick={handleInitialSubmit} disabled={!canSubmit || submitting}>
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
