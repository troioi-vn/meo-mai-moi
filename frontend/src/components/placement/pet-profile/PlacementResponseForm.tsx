import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
}: Props) {
  if (loading) return <p className="py-4 text-center">Loading helper profiles...</p>
  if (helperProfiles.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-4 rounded-full bg-muted p-3">
          <AlertTriangle className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any helper profiles yet.
        </p>
        <p className="text-xs text-muted-foreground">Create one to start helping pets.</p>
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
                {typeof profile.city === 'string' ? profile.city : profile.city?.name},{' '}
                {profile.state}
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
