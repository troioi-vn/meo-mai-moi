import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          Change password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Update your password to keep your account secure.</DialogDescription>
        </DialogHeader>
        <ChangePasswordForm onSuccess={() => { setOpen(false) }} />
      </DialogContent>
    </Dialog>
  )
}
