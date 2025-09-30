import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Status = 'active' | 'lost' | 'deceased' | 'deleted' | ''

type Props = {
  currentStatus: Exclude<Status, ''>
  newStatus: Exclude<Status, 'deleted' | ''>
  setNewStatus: (s: Exclude<Status, 'deleted' | ''>) => void
  statusPassword: string
  setStatusPassword: (s: string) => void
  onUpdateStatus: () => void
  isUpdating: boolean
}

export const PetStatusControls: React.FC<Props> = ({
  currentStatus,
  newStatus,
  setNewStatus,
  statusPassword,
  setStatusPassword,
  onUpdateStatus,
  isUpdating,
}) => {
  return (
    <div className="border-t pt-6">
      <h2 className="text-xl font-semibold text-card-foreground">Status</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Current status: <span className="font-medium">{currentStatus || '...'}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-[200px_1fr] items-center">
        <div className="text-sm font-medium">New status</div>
        <div>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof newStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="deceased">Deceased</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm font-medium">Password</div>
        <div>
          <Input
            type="password"
            placeholder="Confirm with your password"
            value={statusPassword}
            onChange={(e) => setStatusPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={onUpdateStatus} disabled={isUpdating}>
          {isUpdating ? 'Updating...' : 'Update status'}
        </Button>
      </div>
    </div>
  )
}
