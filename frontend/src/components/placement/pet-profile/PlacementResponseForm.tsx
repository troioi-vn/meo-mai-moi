import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, XCircle } from 'lucide-react'
import type { HelperProfile } from '@/types/helper-profile'
import type { FosteringType, RelationshipType } from '@/hooks/usePlacementResponse'

interface Props {
  loading: boolean
  helperProfiles: HelperProfile[]
  selectedProfile: string
  setSelectedProfile: (v: string) => void
  requestedRelationshipType: RelationshipType
  fosteringType: FosteringType
  setFosteringType: (v: FosteringType) => void
  price: string
  setPrice: (v: string) => void
  requestTypeWarning?: string
  cityWarning?: string
  countryWarning?: string
  onCreateHelperProfile: () => void
}

export function PlacementResponseForm({
  loading,
  helperProfiles,
  selectedProfile,
  setSelectedProfile,
  requestedRelationshipType,
  fosteringType,
  setFosteringType,
  price,
  setPrice,
  requestTypeWarning,
  cityWarning,
  countryWarning,
  onCreateHelperProfile,
}: Props) {
  if (loading) return <p>Loading helper profiles...</p>
  if (helperProfiles.length === 0)
    return (
      <div className="text-center">
        <p className="mb-4">You must have a helper profile to respond to a placement request.</p>
        <Button onClick={onCreateHelperProfile}>Create Helper Profile</Button>
      </div>
    )

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <label htmlFor="helper-profile" className="text-right">
          Helper Profile
        </label>
        <Select onValueChange={setSelectedProfile} value={selectedProfile}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select a profile..." />
          </SelectTrigger>
          <SelectContent>
            {helperProfiles.map((profile) => (
              <SelectItem key={profile.id} value={String(profile.id)}>
                {profile.city}, {profile.state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Warning alerts */}
      {requestTypeWarning && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{requestTypeWarning}</AlertDescription>
        </Alert>
      )}
      {countryWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{countryWarning}</AlertDescription>
        </Alert>
      )}
      {cityWarning && !countryWarning && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{cityWarning}</AlertDescription>
        </Alert>
      )}

      {requestedRelationshipType === 'fostering' && (
        <>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="fostering-type" className="text-right">
              Fostering Type
            </label>
            <Select
              onValueChange={(v) => {
                setFosteringType(v as FosteringType)
              }}
              value={fosteringType}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select fostering type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fosteringType === 'paid' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="price" className="text-right">
                Price
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                className="col-span-3 rounded-md border bg-background px-3 py-2"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value)
                }}
                placeholder="Enter price"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
