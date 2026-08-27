import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { recoverFromStaleApp } from '@/pwa'

interface AppUpdateStateProps {
  onUpdate?: () => void
}

/**
 * Shown when the running app can no longer load its own assets, which in
 * practice means a newer build has replaced it. This is routine, not an
 * error, so it reads like an update prompt rather than a crash.
 */
export const AppUpdateState: React.FC<AppUpdateStateProps> = ({ onUpdate }) => {
  const { t } = useTranslation('common')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = () => {
    if (isUpdating) return

    setIsUpdating(true)

    if (onUpdate) {
      onUpdate()
      return
    }

    void recoverFromStaleApp()
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center space-y-4">
          <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">{t('status.updateAvailable')}</h2>
          <p className="text-muted-foreground">{t('status.updateAvailableDescription')}</p>
          <div className="flex justify-center pt-2">
            <Button onClick={handleUpdate} disabled={isUpdating} aria-busy={isUpdating}>
              {isUpdating ? <Loader2 className="animate-spin" /> : null}
              {t('status.updateNow')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
