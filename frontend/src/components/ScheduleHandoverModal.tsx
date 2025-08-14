import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/api/axios'
import { toast } from 'sonner'

interface ScheduleHandoverModalProps {
  transferRequestId: number
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const ScheduleHandoverModal: React.FC<ScheduleHandoverModalProps> = ({ transferRequestId, isOpen, onClose, onSuccess }) => {
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
    } catch (e: any) {
      const status = e?.response?.status
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
          <label className="grid grid-cols-4 items-center gap-3">
            <span className="text-right">Date & Time</span>
            <input
              type="datetime-local"
              className="col-span-3 rounded-md border bg-background px-3 py-2"
              value={scheduledAt}
              onChange={(e) => { setScheduledAt(e.target.value) }}
            />
          </label>
          <label className="grid grid-cols-4 items-center gap-3">
            <span className="text-right">Location</span>
            <input
              type="text"
              placeholder="Cafe address or public spot"
              className="col-span-3 rounded-md border bg-background px-3 py-2"
              value={location}
              onChange={(e) => { setLocation(e.target.value) }}
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ScheduleHandoverModal
