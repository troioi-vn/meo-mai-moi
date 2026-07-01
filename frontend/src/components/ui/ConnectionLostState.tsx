import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ConnectionLostStateProps {
  onRetry?: () => void
}

export const ConnectionLostState: React.FC<ConnectionLostStateProps> = ({ onRetry }) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
      return
    }
    window.location.reload()
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center space-y-4">
          <WifiOff className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">{t('status.connectionLost')}</h2>
          <p className="text-muted-foreground">{t('status.pageUnavailableOffline')}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button variant="outline" onClick={handleRetry}>
              {t('status.retryConnection')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void navigate('/')
              }}
            >
              {t('actions.goHome')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
