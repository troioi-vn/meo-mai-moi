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
import { deleteCat, updateCatStatus } from '@/api/cats'
import { toast } from 'sonner'
import { AxiosError } from 'axios'

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

interface EnhancedCatRemovalModalProps {
  catId: string
  catName: string
  onSuccess: () => void
}

const EnhancedCatRemovalModal: React.FC<EnhancedCatRemovalModalProps> = ({
  catId,
  catName,
  onSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [nameConfirmation, setNameConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState<'delete' | 'deceased' | null>(null)

  const resetModal = () => {
    setStep(1)
    setNameConfirmation('')
    setPassword('')
    setAction(null)
    setIsLoading(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    resetModal()
  }

  const handleStep1Submit = () => {
    if (nameConfirmation.trim().toLowerCase() !== catName.toLowerCase()) {
      toast.error(`Please type "${catName}" exactly to confirm`)
      return
    }
    setStep(2)
  }

  const handleStep2Action = (selectedAction: 'delete' | 'deceased') => {
    setAction(selectedAction)
    setStep(3)
  }

  const handleFinalSubmit = async () => {
    if (!password.trim()) {
      toast.error('Please enter your password')
      return
    }

    if (!action) {
      toast.error('Please select an action')
      return
    }

    setIsLoading(true)
    try {
      if (action === 'delete') {
        await deleteCat(catId, password)
        toast.success('Cat profile has been permanently deleted')
      } else {
        await updateCatStatus(catId, 'deceased', password)
        toast.success('Cat has been marked as deceased')
      }

      handleClose()
      onSuccess()
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred.'
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiError>
        errorMessage = axiosError.response?.data.message ?? axiosError.message

        // Handle specific validation errors
        if (axiosError.response?.data.errors?.password) {
          errorMessage = axiosError.response.data.errors.password[0]
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm Cat Name</AlertDialogTitle>
        <AlertDialogDescription>
          To proceed with removing {catName}'s profile, please type the cat's name exactly as shown
          below:
          <br />
          <strong className="text-foreground mt-2 block">{catName}</strong>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name-confirmation">Type cat's name to confirm</Label>
          <Input
            id="name-confirmation"
            type="text"
            value={nameConfirmation}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNameConfirmation(e.target.value)
            }}
            placeholder={catName}
            disabled={isLoading}
          />
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
          Cancel
        </AlertDialogCancel>
        <Button onClick={handleStep1Submit} disabled={isLoading}>
          Continue
        </Button>
      </AlertDialogFooter>
    </>
  )

  const renderStep2 = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Choose Action</AlertDialogTitle>
        <AlertDialogDescription>
          How would you like to handle {catName}'s profile? Choose one of the options below:
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-3">
          <Button
            variant="destructive"
            onClick={() => {
              handleStep2Action('delete')
            }}
            disabled={isLoading}
            className="w-full h-auto text-left p-4 whitespace-normal"
          >
            <div className="text-left">
              <div className="font-semibold">Delete Permanently</div>
              <div className="text-sm opacity-90 font-normal mt-1">
                Completely remove {catName}'s profile and all associated data. This cannot be
                undone.
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              handleStep2Action('deceased')
            }}
            disabled={isLoading}
            className="w-full h-auto text-left p-4 whitespace-normal"
          >
            <div className="text-left">
              <div className="font-semibold">Mark as Deceased</div>
              <div className="text-sm text-muted-foreground font-normal mt-1">
                Hide {catName}'s profile but preserve their memory and history.
              </div>
            </div>
          </Button>
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel
          onClick={() => {
            setStep(1)
          }}
          disabled={isLoading}
        >
          Back
        </AlertDialogCancel>
        <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
          Cancel
        </AlertDialogCancel>
      </AlertDialogFooter>
    </>
  )

  const renderStep3 = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm Your Password</AlertDialogTitle>
        <AlertDialogDescription>
          {action === 'delete'
            ? `You are about to permanently delete ${catName}'s profile. This action cannot be undone.`
            : `You are about to mark ${catName} as deceased. This will change their status but preserve their profile.`}
          <br />
          Please enter your password to confirm this action.
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
            placeholder="Enter your password"
          />
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel
          onClick={() => {
            setStep(2)
          }}
          disabled={isLoading}
        >
          Back
        </AlertDialogCancel>
        <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={() => void handleFinalSubmit()}
          disabled={isLoading || !password.trim()}
          className={
            action === 'delete'
              ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              : ''
          }
        >
          {isLoading
            ? 'Processing...'
            : action === 'delete'
              ? 'Delete Permanently'
              : 'Mark as Deceased'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          onClick={() => {
            setIsOpen(true)
          }}
        >
          Remove Cat
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[500px] max-w-[90vw]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { EnhancedCatRemovalModal }
