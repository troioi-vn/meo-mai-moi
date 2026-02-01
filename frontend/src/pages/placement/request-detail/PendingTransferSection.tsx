import { useTranslation } from 'react-i18next'
import { Clock, MessageCircle } from 'lucide-react'
import type { PlacementRequestDetail, PlacementRequestResponse } from '@/types/placement'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PendingTransferSectionProps {
  request: PlacementRequestDetail
  acceptedResponse: PlacementRequestResponse
  creatingChat: boolean
  onChat: (userId: number) => Promise<void>
}

export function PendingTransferSection({
  request,
  acceptedResponse,
  creatingChat,
  onChat,
}: PendingTransferSectionProps) {
  const { t } = useTranslation('common')

  if (request.status !== 'pending_transfer') return null

  const helperName =
    acceptedResponse.helper_profile?.user?.name ?? t('requestDetail.theHelper')

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('requestDetail.awaitingHandover')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
            <Clock className="h-4 w-4" />
            <span>{t('requestDetail.waitingForHandover', { name: helperName })}</span>
          </div>

          {acceptedResponse.helper_profile?.user?.id && (
            <Button
              variant="outline"
              onClick={() => {
                const id = acceptedResponse.helper_profile?.user?.id
                if (id) {
                  void onChat(id)
                }
              }}
              disabled={creatingChat}
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {creatingChat
                ? t('requestDetail.startingChat')
                : t('requestDetail.chatWithHelper')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
