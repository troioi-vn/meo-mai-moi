import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MessageCircle, Share2 } from 'lucide-react'
import type { PlacementRequestDetail } from '@/types/placement'
import { formatStatus } from '@/types/placement'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AppBreadcrumbs } from '@/components/layout/PageLayout'
import { toast } from '@/lib/i18n-toast'
import { RequestQrDialog } from './RequestQrDialog'
import { getStatusBadgeVariant } from './utils'

interface RequestDetailHeaderProps {
  request: PlacementRequestDetail
  petCity?: string | null
  /** Owners get the QR code; adopters reading the page have no use for one. */
  showQrCode?: boolean
  variant?: 'standard' | 'discovery'
}

/**
 * Sharing this page is the whole point of it existing — owners spread the link
 * and adopters arrive through it — but until now there was no way to do it from
 * inside the app. navigator.share is the native sheet on the phones that QR
 * scans land on; everything else falls back to the clipboard.
 */
export function RequestDetailHeader({
  request,
  petCity,
  showQrCode = false,
  variant = 'standard',
}: RequestDetailHeaderProps) {
  const { t } = useTranslation(['common', 'placement'])

  const handleShare = () => {
    const url = window.location.href
    const title = t('placement:requestTypes.' + request.request_type, {
      defaultValue: request.request_type,
    })

    if (typeof navigator.share === 'function') {
      // Rejects when the user dismisses the sheet, which is not an error.
      void navigator.share({ title: `${request.pet.name} — ${title}`, url }).catch(() => undefined)
      return
    }

    void navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success('common:sharing.linkCopied')
      })
      .catch(() => {
        toast.error('common:errors.generic')
      })
  }

  const breadcrumbs = (
    <AppBreadcrumbs
      className="mb-0"
      items={[
        { label: t('requestDetail.breadcrumb.requests'), to: '/requests' },
        { label: request.pet.name, to: `/pets/${String(request.pet.id)}/view` },
        { label: t('requestDetail.breadcrumb.request', { id: request.id }) },
      ]}
    />
  )

  const shareButton = (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 className="mr-1 h-4 w-4" />
      {t('sharing.shareRequest')}
    </Button>
  )

  if (variant === 'discovery') {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {breadcrumbs}
        {shareButton}
      </div>
    )
  }

  return (
    <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pb-4 mb-6 -mx-4 px-4 border-b">
      <div className="mb-3">{breadcrumbs}</div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {request.pet.photo_url && (
            <img
              src={request.pet.photo_url}
              alt={request.pet.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {t(`placement:requestTypes.${request.request_type}`, {
                defaultValue: request.request_type,
              })}
              <Badge variant={getStatusBadgeVariant(request.status)}>
                {formatStatus(request.status)}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {request.pet.name}
              {petCity && ` • ${petCity}`}
              {request.pet.country && `, ${request.pet.country}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {shareButton}
          {showQrCode && <RequestQrDialog url={window.location.href} petName={request.pet.name} />}
          {request.chat_id && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/messages/${String(request.chat_id)}`}>
                <MessageCircle className="h-4 w-4 mr-1" />
                {t('requestDetail.chat')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
