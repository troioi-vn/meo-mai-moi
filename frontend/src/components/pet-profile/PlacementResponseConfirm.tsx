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
  return (
    <div className="py-4">
      <p>Are you sure you want to submit this response?</p>
      <p>Pet: {petName}</p>
      <p>
        Helper Profile: {selected ? `${selected.city ?? ''}, ${selected.state ?? ''}` : ''}
      </p>
  <p>Relationship Type: {requestedRelationshipType.replace('_', ' ').toUpperCase()}</p>
      {requestedRelationshipType === 'fostering' && (
        <>
          <p>Fostering Type: {fosteringType.toUpperCase()}</p>
          {fosteringType === 'paid' && <p>Price: {price}</p>}
        </>
      )}
    </div>
  )
}
