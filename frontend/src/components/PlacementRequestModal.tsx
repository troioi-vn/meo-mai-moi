import { useCreatePlacementRequest } from '@/hooks/useCreatePlacementRequest';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from "@/components/ui/textarea"

interface PlacementRequestModalProps {
  catId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const PlacementRequestModal: React.FC<PlacementRequestModalProps> = ({ catId, isOpen, onClose }) => {
  const [requestType, setRequestType] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const createPlacementRequestMutation = useCreatePlacementRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPlacementRequestMutation.mutate(
      {
        cat_id: catId,
        request_type: requestType,
        notes,
        expires_at: expiresAt || undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Placement Request</DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new placement request for your cat.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="request-type" className="text-right">
                Request Type
              </Label>
              <Select onValueChange={setRequestType} value={requestType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a request type" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="foster_payed">Foster (Paid)</SelectItem>
                  <SelectItem value="foster_free">Foster (Free)</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
                className="col-span-3"
                placeholder="Describe your cat and any specific needs or requirements."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expires-at" className="text-right">
                Expires In
              </Label>
              <Select
                onValueChange={(value) => {
                  if (value) {
                    const date = new Date();
                    const [amount, unit] = value.split('_');
                    if (unit === 'week') {
                      date.setDate(date.getDate() + parseInt(amount, 10) * 7);
                    } else if (unit === 'month') {
                      date.setMonth(date.getMonth() + parseInt(amount, 10));
                    }
                    setExpiresAt(date.toISOString().split('T')[0]);
                  } else {
                    setExpiresAt('');
                  }
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a duration" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="1_week">1 week</SelectItem>
                  <SelectItem value="1_month">1 month</SelectItem>
                  <SelectItem value="3_month">3 months</SelectItem>
                  <SelectItem value="6_month">6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPlacementRequestMutation.isPending}>
              {createPlacementRequestMutation.isPending ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};