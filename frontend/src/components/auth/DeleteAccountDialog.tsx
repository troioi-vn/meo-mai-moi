import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['auth', 'common'])
  const { deleteAccount } = useAuth()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleDeleteAccount = async (): Promise<void> => {
    setIsLoading(true)
    try {
      await deleteAccount(password)
      toast({
        title: t('auth:deleteAccount.successTitle'),
        description: t('auth:deleteAccount.successDescription'),
      })
      setIsOpen(false)
      onAccountDeleted()
    } catch (error: unknown) {
      let errorMessage = t('common:errors.generic')
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiError>
        errorMessage = axiosError.response?.data.message ?? axiosError.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      toast({
        title: t('auth:deleteAccount.failedTitle'),
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
        <Button variant="destructive">{t('auth:deleteAccount.title')}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('auth:deleteAccount.confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('auth:deleteAccount.confirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="password">{t('auth:deleteAccount.passwordLabel')}</Label>
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
          <AlertDialogCancel disabled={isLoading}>{t('common:actions.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleDeleteAccount()} disabled={isLoading}>
            {isLoading ? t('auth:deleteAccount.deleting') : t('auth:deleteAccount.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { DeleteAccountDialog }
