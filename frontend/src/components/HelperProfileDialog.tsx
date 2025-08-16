import React from 'react'
import type { HelperProfile } from '@/types/helper-profile'
import type { TransferRequest } from '@/types/cat'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface HelperProfileDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  profile: HelperProfile | null
  transfer: TransferRequest | null
  loading: boolean
  error: string | null
  onConfirm: () => void
  onReject: () => void
}

export const HelperProfileDialog: React.FC<HelperProfileDialogProps> = ({ open, onOpenChange, profile, transfer, loading, error, onConfirm, onReject }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Helper Profile</DialogTitle>
        <DialogDescription className="sr-only">
          Review the responder’s helper profile details, then confirm or reject the response.
        </DialogDescription>
      </DialogHeader>
      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : profile ? (
        <div className="space-y-3">
          {transfer && (
            <div className="rounded border p-3 bg-muted/50">
              <p className="font-semibold mb-1">Response Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <p><strong>Relationship:</strong> {transfer.requested_relationship_type ?? 'N/A'}</p>
                {typeof transfer.fostering_type !== 'undefined' && (
                  <p><strong>Fostering Type:</strong> {transfer.fostering_type ?? 'N/A'}</p>
                )}
                {typeof transfer.price !== 'undefined' && (
                  <p><strong>Price:</strong> {transfer.price ?? 'N/A'}</p>
                )}
                <p><strong>Status:</strong> {transfer.status ?? 'pending'}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p><strong>Name:</strong> {profile.user?.name ?? 'N/A'}</p>
            <p><strong>Email:</strong> {profile.user?.email ?? 'N/A'}</p>
            <p><strong>Phone:</strong> {profile.phone_number ?? profile.phone ?? 'N/A'}</p>
            <p><strong>City:</strong> {profile.city ?? 'N/A'}</p>
            <p><strong>State:</strong> {profile.state ?? 'N/A'}</p>
            <p><strong>Country:</strong> {profile.country ?? 'N/A'}</p>
            <p><strong>Zip Code:</strong> {profile.zip_code ?? 'N/A'}</p>
            <p><strong>Has pets:</strong> {profile.has_pets ? 'Yes' : 'No'}</p>
            <p><strong>Has children:</strong> {profile.has_children ? 'Yes' : 'No'}</p>
            <p><strong>Can foster:</strong> {profile.can_foster ? 'Yes' : 'No'}</p>
            <p><strong>Can adopt:</strong> {profile.can_adopt ? 'Yes' : 'No'}</p>
            <p><strong>Status:</strong> {profile.status ?? 'N/A'}</p>
          </div>
          {profile.experience && (
            <div>
              <p className="font-semibold">Experience</p>
              <p className="text-muted-foreground whitespace-pre-line">{profile.experience}</p>
            </div>
          )}
          {Array.isArray(profile.photos) && profile.photos.length > 0 && (
            <div>
              <p className="font-semibold mb-1">Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {profile.photos.map((ph) => {
                  const key = typeof ph === 'string' ? ph : (ph && typeof ph === 'object' && 'id' in ph ? String((ph as { id: string | number }).id) : '')
                  const src = typeof ph === 'string' ? ph : (ph && typeof ph === 'object' && 'path' in ph ? `/storage/${((ph as { path?: string }).path ?? '')}` : '')
                  return <img key={key} src={src} alt="Helper" className="rounded object-cover w-full h-24" />
                })}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onConfirm}>Confirm</Button>
            <Button variant="destructive" onClick={onReject}>Reject</Button>
          </div>
        </div>
      ) : (
        <p>No profile available.</p>
      )}
    </DialogContent>
  </Dialog>
)
