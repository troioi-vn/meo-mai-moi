import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Status = 'active' | 'lost' | 'deceased' | 'deleted' | ''

interface Props {
  currentStatus: Exclude<Status, ''>
  newStatus: Exclude<Status, 'deleted' | ''>
  setNewStatus: (s: Exclude<Status, 'deleted' | ''>) => void
  onUpdateStatus: () => void
  isUpdating: boolean
}

export const PetStatusControls: React.FC<Props> = ({
  currentStatus,
  newStatus,
  setNewStatus,
  onUpdateStatus,
  isUpdating,
}) => {
  const statusChanged = currentStatus !== newStatus

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Current status: <span className="font-medium">{currentStatus}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr] items-center">
          <div className="text-sm font-medium">New status</div>
          <div>
            <Select
              value={newStatus}
              onValueChange={(v) => {
                setNewStatus(v as typeof newStatus)
              }}
            >
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
        </div>
        <div className="pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isUpdating || !statusChanged}>
                {isUpdating ? 'Updating...' : 'Update status'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Update pet status?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to change the status from{' '}
                  <span className="font-medium">{currentStatus}</span> to{' '}
                  <span className="font-medium">{newStatus}</span>?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onUpdateStatus}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
