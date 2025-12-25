import type { HelperProfile } from '@/types/helper-profile'

interface Props {
  petName: string
  helperProfiles: HelperProfile[]
  selectedProfile: string
  requestedRelationshipType: string
  fosteringType: 'free' | 'paid'
  price: string
}

export function PlacementResponseConfirm({
  petName,
  helperProfiles,
  selectedProfile,
  requestedRelationshipType,
  fosteringType,
  price,
}: Props) {
  const selected = helperProfiles.find((hp) => String(hp.id) === selectedProfile)
  const cityName = typeof selected?.city === 'object' ? selected.city.name : (selected?.city ?? '')

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Please review your response details before confirming.
      </p>
      <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Pet:</span>
          <span>{petName}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Helper Profile:</span>
          <span>{selected ? `${cityName}, ${selected.state ?? ''}` : 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Type:</span>
          <span className="capitalize">
            {requestedRelationshipType ? requestedRelationshipType.replace('_', ' ') : ''}
          </span>
        </div>
        {requestedRelationshipType === 'fostering' && (
          <>
            <div className="flex justify-between">
              <span className="font-medium">Fostering:</span>
              <span className="capitalize">{fosteringType}</span>
            </div>
            {fosteringType === 'paid' && (
              <div className="flex justify-between">
                <span className="font-medium">Price:</span>
                <span>{price}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
