import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, XCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
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
  message: string
  setMessage: (v: string) => void
  requestTypeWarning?: string
  cityWarning?: string
  countryWarning?: string
}

export function PlacementResponseForm({
  loading,
  helperProfiles,
  selectedProfile,
  setSelectedProfile,
  requestedRelationshipType: _requestedRelationshipType,
  fosteringType: _fosteringType,
  setFosteringType: _setFosteringType,
  price: _price,
  setPrice: _setPrice,
  message,
  setMessage,
  requestTypeWarning,
  cityWarning,
  countryWarning,
}: Props) {
  // These variables are retained for interface compatibility but not used in current UI
  void _requestedRelationshipType
  void _fosteringType
  void _setFosteringType
  void _price
  void _setPrice
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

      <div className="grid grid-cols-4 items-start gap-4">
        <label htmlFor="message" className="text-right pt-2">
          Message
        </label>
        <Textarea
          id="message"
          placeholder="Optional message to the owner..."
          className="col-span-3"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
          }}
          rows={4}
        />
      </div>
    </div>
  )
}
