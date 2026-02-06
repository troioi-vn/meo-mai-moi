import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

interface Props {
  isDeleting: boolean
  onDelete: (password: string) => void
}

export const PetDangerZone: React.FC<Props> = ({ isDeleting, onDelete }) => {
  const { t } = useTranslation(['pets', 'common'])
  const [password, setPassword] = useState('')
  const [open, setOpen] = useState(false)

  const handleConfirm = () => {
    onDelete(password)
    // Don't close dialog - let parent handle it after success
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setPassword('')
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">{t('pets:dangerZone.title')}</CardTitle>
        <CardDescription>{t('pets:dangerZone.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              {isDeleting ? t('pets:dangerZone.removing') : t('pets:dangerZone.removeButton')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('pets:dangerZone.dialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('pets:dangerZone.dialogDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                type="password"
                placeholder={t('pets:dangerZone.passwordPlaceholder')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                }}
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!password.trim() || isDeleting}
              >
                {isDeleting ? t('pets:dangerZone.removing') : t('pets:dangerZone.confirmButton')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
