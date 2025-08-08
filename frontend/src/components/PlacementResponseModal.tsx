import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/api/axios';
import type { HelperProfile } from '@/types/helper-profile.ts';
import { toast } from 'sonner';

interface PlacementResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  catName: string;
  catId: number;
  placementRequestId: number;
  onSuccess?: () => void;
}

export const PlacementResponseModal: React.FC<PlacementResponseModalProps> = ({ isOpen, onClose, catName, catId, placementRequestId, onSuccess }) => {
  const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [requestedRelationshipType, setRequestedRelationshipType] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fosteringType, setFosteringType] = useState<'free' | 'paid'>('free');
  const [price, setPrice] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleInitialSubmit = () => {
    if (!selectedProfile || !requestedRelationshipType) {
      toast.error('Please select a helper profile and a relationship type.');
      return;
    }
    if (requestedRelationshipType === 'fostering' && fosteringType === 'paid') {
      const amount = parseFloat(price);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid price greater than 0 for paid fostering.');
        return;
      }
    }
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await api.post('transfer-requests', {
        cat_id: catId,
        placement_request_id: placementRequestId,
        helper_profile_id: selectedProfile ? Number(selectedProfile) : undefined,
  requested_relationship_type: requestedRelationshipType,
  fostering_type: requestedRelationshipType === 'fostering' ? fosteringType : undefined,
  price: requestedRelationshipType === 'fostering' && fosteringType === 'paid' ? parseFloat(price) : undefined,
      });
      toast.success('Placement response submitted successfully!');
      // Let parent refresh the cat data so the new pending response appears
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      setShowConfirmation(false);
    } catch (error) {
      console.error('Failed to submit placement response', error);
      // Surface validation errors if present
      const anyErr = error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } };
      if (anyErr.response?.status === 409) {
        toast.info("You've already responded to this request. We'll refresh the page.");
        if (onSuccess) onSuccess();
        onClose();
        setShowConfirmation(false);
        return;
      }
      if (anyErr.response?.status === 422) {
        const errs = anyErr.response.data?.errors;
        const msg = Object.values(errs ?? {}).flat().join('\n') || anyErr.response.data?.message || 'Validation error.';
        toast.error(msg);
      } else {
        toast.error('Failed to submit placement response.');
      }
    }
      setSubmitting(false);
  };

  useEffect(() => {
    if (isOpen) {
      const fetchHelperProfiles = async () => {
        try {
          setLoading(true);
          const response = await api.get('helper-profiles');
          setHelperProfiles(response.data.data);
        } catch (error) {
          console.error('Failed to fetch helper profiles', error);
          toast.error('Failed to fetch helper profiles.');
        } finally {
          setLoading(false);
        }
      };
      void fetchHelperProfiles();
    }
  }, [isOpen]);

  // When relationship type changes, reset fostering details accordingly
  useEffect(() => {
    if (requestedRelationshipType !== 'fostering') {
      setFosteringType('free');
      setPrice('');
    }
  }, [requestedRelationshipType]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Respond to Placement Request for {catName}</DialogTitle>
          <DialogDescription>
            Select your helper profile and the relationship type to respond. You can confirm before submitting.
          </DialogDescription>
        </DialogHeader>
        {!showConfirmation ? (
          <div>
            {loading ? (
              <p>Loading helper profiles...</p>
            ) : helperProfiles && helperProfiles.length > 0 ? (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="helper-profile" className="text-right">Helper Profile</label>
                  <Select onValueChange={setSelectedProfile} value={selectedProfile || ''}>
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="relationship-type" className="text-right">Relationship Type</label>
                  <Select onValueChange={setRequestedRelationshipType} value={requestedRelationshipType || ''}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fostering">Fostering</SelectItem>
                      <SelectItem value="permanent_foster">Permanent Foster</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {requestedRelationshipType === 'fostering' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="fostering-type" className="text-right">Fostering Type</label>
                      <Select onValueChange={(v) => setFosteringType(v as 'free' | 'paid')} value={fosteringType}>
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
                        <label htmlFor="price" className="text-right">Price</label>
                        <input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          className="col-span-3 rounded-md border bg-background px-3 py-2"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="Enter price"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-4">You must have a helper profile to respond to a placement request.</p>
                <Button onClick={() => window.location.href = '/helper-profiles/create'}>Create Helper Profile</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4">
            <p>Are you sure you want to submit this response?</p>
            <p>Cat: {catName}</p>
            <p>Helper Profile: {helperProfiles.find(p => String(p.id) === selectedProfile)?.city}, {helperProfiles.find(p => String(p.id) === selectedProfile)?.state}</p>
            <p>Relationship Type: {requestedRelationshipType?.replace('_', ' ').toUpperCase()}</p>
            {requestedRelationshipType === 'fostering' && (
              <>
                <p>Fostering Type: {fosteringType.toUpperCase()}</p>
                {fosteringType === 'paid' && <p>Price: {price}</p>}
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          {!showConfirmation ? (
            <Button onClick={handleInitialSubmit} disabled={!selectedProfile || !requestedRelationshipType || submitting}>Submit</Button>
          ) : (
            <Button onClick={handleConfirmSubmit} disabled={submitting}>Confirm Submission</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
