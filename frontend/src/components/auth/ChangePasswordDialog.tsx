import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['auth', 'settings'])
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          {t('settings:security.changePassword.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>{t('settings:security.changePassword.title')}</DialogTitle>
          <DialogDescription>{t('settings:security.changePassword.description')}</DialogDescription>
        </DialogHeader>
        <ChangePasswordForm
          onSuccess={() => {
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
