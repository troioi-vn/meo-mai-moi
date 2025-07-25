import React, { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/use-toast'
import { AxiosError } from 'axios'

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

interface DeleteAccountDialogProps {
  onAccountDeleted: () => void
}

const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({ onAccountDeleted }) => {
  const { deleteAccount, logout } = useAuth()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleDeleteAccount = async (): Promise<void> => {
    setIsLoading(true)
    try {
      await deleteAccount(password)
      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted.',
      })
      setIsOpen(false)
      void logout()
      onAccountDeleted()
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred.'
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiError>
        errorMessage = axiosError.response?.data.message ?? axiosError.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      toast({
        title: 'Account Deletion Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove your
            data from our servers. To confirm, please type your password below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Your Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPassword(e.target.value)
              }}
              disabled={isLoading}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleDeleteAccount()} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete My Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { DeleteAccountDialog }
