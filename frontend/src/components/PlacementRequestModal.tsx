import { useCreatePlacementRequest } from '@/hooks/useCreatePlacementRequest';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, addMonths } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlacementRequestModalProps {
  catId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialValues?: {
    request_type?: string;
    start_date?: Date;
    end_date?: Date;
    notes?: string;
  };
}

export const PlacementRequestModal: React.FC<PlacementRequestModalProps> = ({ catId, isOpen, onClose, onSuccess, initialValues }) => {
  const [requestType, setRequestType] = useState(initialValues?.request_type || '');
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(initialValues?.start_date);
  const [endDate, setEndDate] = useState<Date | undefined>(initialValues?.end_date);
  const createPlacementRequestMutation = useCreatePlacementRequest();

  useEffect(() => {
    if (requestType === 'permanent') {
      const sixMonthsFromNow = addMonths(new Date(), 6);
      setExpiresAt(sixMonthsFromNow);
    } else {
      setExpiresAt(startDate);
    }
  }, [requestType, startDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic client-side validation to align with backend (start_date required)
    if (!requestType || !startDate) {
      return;
    }
    createPlacementRequestMutation.mutate(
      {
        cat_id: catId,
        request_type: requestType,
        notes,
        expires_at: expiresAt ? format(expiresAt, 'yyyy-MM-dd') : undefined,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        end_date: requestType !== 'permanent' && endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      },
      {
        onSuccess: () => {
          onSuccess?.();
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
              <Label htmlFor="start-date" className="text-right">
                Start Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover">
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-zinc-900 text-black dark:text-white rounded-lg">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      autoFocus
                    />
                  </PopoverContent>
                </PopoverContent>
              </Popover>
            </div>
            {requestType !== 'permanent' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end-date" className="text-right">
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover">
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-zinc-900 text-black dark:text-white rounded-lg">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        autoFocus
                      />
                    </PopoverContent>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPlacementRequestMutation.isPending || !requestType || !startDate}>
              {createPlacementRequestMutation.isPending ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
