import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/api/axios'
import { toast } from 'sonner'

interface ScheduleHandoverModalProps {
  transferRequestId: number
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const ScheduleHandoverModal: React.FC<ScheduleHandoverModalProps> = ({
  transferRequestId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (submitting) return
    try {
      setSubmitting(true)
      await api.post(`transfer-requests/${String(transferRequestId)}/handover`, {
        scheduled_at: scheduledAt || undefined,
        location: location || undefined,
      })
      toast.success('Handover scheduled')
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } }
      const status = err.response?.status
      if (status === 409) {
        toast.info('Request is not in a state that can be scheduled.')
      } else if (status === 422) {
        toast.error('Please provide valid date/time or location.')
      } else {
        toast.error('Failed to schedule handover')
      }
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule handover</DialogTitle>
          <DialogDescription>
            Pick a tentative date/time and meeting location. The helper will be notified to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label htmlFor="scheduled-at" className="text-right">
              Date & Time
            </Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              className="col-span-3"
              value={scheduledAt}
              onChange={(e) => {
                setScheduledAt(e.target.value)
              }}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label htmlFor="location" className="text-right">
              Location
            </Label>
            <Input
              id="location"
              type="text"
              placeholder="Cafe address or public spot"
              className="col-span-3"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleSubmit()
            }}
            disabled={submitting}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ScheduleHandoverModal
