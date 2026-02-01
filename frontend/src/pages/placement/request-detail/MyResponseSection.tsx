import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MessageCircle,
  Send,
  UserPlus,
  X,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  HandshakeIcon,
  Home,
  Loader2,
} from 'lucide-react'
import type { HelperProfile } from '@/types/helper-profile'
import type { PlacementRequestDetail, PlacementRequestResponse } from '@/types/placement'
import { isTemporaryType, PlacementResponseStatusLabels } from '@/types/placement'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getResponseStatusBadgeVariant } from './utils'

interface MyResponseSectionProps {
  request: PlacementRequestDetail
  canShow: boolean
  isHelper: boolean
  isPotentialHelper: boolean
  actions: PlacementRequestDetail['available_actions']
  myResponse?: PlacementRequestResponse
  myTransferId?: number

  helperProfiles: HelperProfile[]
  loadingProfiles: boolean
  selectedProfileId: string
  onSelectedProfileIdChange: (id: string) => void

  responseMessage: string
  onResponseMessageChange: (value: string) => void

  requestTypeWarning?: string
  cityWarning?: string
  countryWarning?: string
  canSubmitResponse: boolean
  submittingResponse: boolean
  onSubmitResponse: () => Promise<void>

  actionLoading: string | null
  onCancelMyResponse: (responseId: number) => Promise<void>
  onConfirmHandover: (transferId: number) => Promise<void>

  canChatWithOwner: boolean
  creatingChat: boolean
  onChatOwner: () => Promise<void>

  onCreateHelperProfile: () => void
}

function InfoRow({ children }: { children: ReactNode }) {
  return <div className="rounded-md bg-muted/50 p-6 text-center space-y-4">{children}</div>
}

export function MyResponseSection({
  request,
  canShow,
  isHelper,
  isPotentialHelper,
  actions,
  myResponse,
  myTransferId,
  helperProfiles,
  loadingProfiles,
  selectedProfileId,
  onSelectedProfileIdChange,
  responseMessage,
  onResponseMessageChange,
  requestTypeWarning,
  cityWarning,
  countryWarning,
  canSubmitResponse,
  submittingResponse,
  onSubmitResponse,
  actionLoading,
  onCancelMyResponse,
  onConfirmHandover,
  canChatWithOwner,
  creatingChat,
  onChatOwner,
  onCreateHelperProfile,
}: MyResponseSectionProps) {
  const { t } = useTranslation('common')

  if (!canShow) return null

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('requestDetail.yourResponse')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {myResponse ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('requestDetail.yourResponseStatus')}</span>
              <Badge variant={getResponseStatusBadgeVariant(myResponse.status)}>
                {PlacementResponseStatusLabels[myResponse.status] ?? myResponse.status}
              </Badge>
            </div>

            {myResponse.message && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {myResponse.message}
              </p>
            )}

            {actions.can_cancel_my_response && (
              <Button
                variant="outline"
                onClick={() => void onCancelMyResponse(myResponse.id)}
                disabled={actionLoading === 'cancel-response'}
                className="w-full"
              >
                {actionLoading === 'cancel-response' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                {t('requestDetail.cancelMyResponse')}
              </Button>
            )}

            {actions.can_confirm_handover && myTransferId && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{t('requestDetail.responseAccepted')}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('requestDetail.confirmHandoverHint')}
                </p>
                <Button
                  onClick={() => void onConfirmHandover(myTransferId)}
                  disabled={actionLoading === 'confirm-handover'}
                  className="w-full"
                >
                  {actionLoading === 'confirm-handover' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <HandshakeIcon className="h-4 w-4 mr-2" />
                  )}
                  {t('requestDetail.confirmHandover')}
                </Button>
              </div>
            )}

            {request.status === 'active' && myResponse.status === 'accepted' && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">
                    {t('requestDetail.caringFor', { name: request.pet.name })}
                  </span>
                </div>
                {isTemporaryType(request.request_type) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('requestDetail.returnHint')}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : actions.can_respond || isPotentialHelper ? (
          <div className="space-y-4">
            {loadingProfiles ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('requestDetail.loadingProfiles')}
                </span>
              </div>
            ) : helperProfiles.length === 0 ? (
              <InfoRow>
                <div className="mx-auto rounded-full bg-muted p-3 w-fit">
                  <UserPlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{t('requestDetail.noHelperProfile')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('requestDetail.noHelperProfileHint')}
                  </p>
                </div>
                <Button onClick={onCreateHelperProfile} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('requestDetail.createHelperProfile')}
                </Button>
              </InfoRow>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('requestDetail.selectHelperProfile')}
                  </label>
                  <Select value={selectedProfileId} onValueChange={onSelectedProfileIdChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('requestDetail.choosePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {helperProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={String(profile.id)}>
                          {typeof profile.city === 'string' ? profile.city : profile.city?.name}
                          {profile.state ? `, ${profile.state}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {requestTypeWarning && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{requestTypeWarning}</AlertDescription>
                  </Alert>
                )}
                {countryWarning && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{countryWarning}</AlertDescription>
                  </Alert>
                )}
                {cityWarning && !countryWarning && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{cityWarning}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('requestDetail.messageToOwner')}{' '}
                    <span className="text-muted-foreground font-normal">
                      {t('requestDetail.messageOptional')}
                    </span>
                  </label>
                  <Textarea
                    placeholder={t('requestDetail.messagePlaceholder')}
                    value={responseMessage}
                    onChange={(e) => {
                      onResponseMessageChange(e.target.value)
                    }}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={() => void onSubmitResponse()}
                  disabled={!canSubmitResponse || submittingResponse}
                  className="w-full"
                >
                  {submittingResponse ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t('requestDetail.sendResponse')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('requestDetail.cannotRespond')}</p>
        )}

        {canChatWithOwner && (isHelper || !!myResponse) && (
          <Button
            variant="outline"
            onClick={() => void onChatOwner()}
            disabled={creatingChat}
            className="w-full"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {creatingChat ? t('requestDetail.startingChat') : t('requestDetail.chatWithOwner')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
