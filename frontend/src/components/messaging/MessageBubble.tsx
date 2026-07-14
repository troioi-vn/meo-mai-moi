import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CheckCheck, Trash2, ZoomIn, ZoomOut, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Attachment, AttachmentMedia, AttachmentTrigger } from '@/components/ui/attachment'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Message, MessageAvatar, MessageContent, MessageFooter } from '@/components/ui/message'
import type { ChatMessage } from '@/api/generated/model'
import { getInitials } from '@/utils/initials'
import { isPremiumUser } from '@/lib/premium-user'
import { PremiumAvatarBadge } from '@/components/user/PremiumAvatarBadge'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

interface MessageBubbleProps {
  message: ChatMessage
  showAvatar: boolean
  isRead?: boolean
  onDelete?: (messageId: number) => void
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
  isRead,
  onDelete,
}) => {
  const { t } = useTranslation(['common', 'media'])
  const isOwn = message.is_mine
  const sender = message.sender
  const premiumAwareSender = sender as typeof sender & { is_premium?: boolean }
  const initials = getInitials(sender.name)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  const openImageViewer = useCallback(() => {
    setZoomLevel(1)
    setIsImageViewerOpen(true)
  }, [])

  const handleImageViewerOpenChange = useCallback((open: boolean) => {
    setIsImageViewerOpen(open)
    if (!open) {
      setZoomLevel(1)
    }
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoomLevel((currentZoom) => Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel((currentZoom) => Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP))
  }, [])

  const align = isOwn ? 'end' : 'start'
  const bubbleVariant = isOwn ? 'default' : 'muted'

  const messageRow = (
    <Message align={align} className="max-w-full">
      {!isOwn && (
        <MessageAvatar>
          {showAvatar ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={sender.avatar_url ?? undefined} alt={sender.name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {initials}
              </AvatarFallback>
              {isPremiumUser(premiumAwareSender) && <PremiumAvatarBadge />}
            </Avatar>
          ) : null}
        </MessageAvatar>
      )}

      <MessageContent className="max-w-[75%] w-auto">
        {message.type === 'image' ? (
          <Attachment orientation="vertical" state="done" className="w-auto max-w-full">
            <AttachmentMedia variant="image" className="aspect-auto w-full max-h-64">
              <img
                src={message.content}
                alt={t('media:alt.chatImage')}
                className="max-h-64 w-auto rounded-lg object-cover"
              />
            </AttachmentMedia>
            <AttachmentTrigger
              onClick={openImageViewer}
              aria-label={t('messaging.openImageViewer')}
            />
          </Attachment>
        ) : (
          <Bubble variant={bubbleVariant} align={align}>
            <BubbleContent className="whitespace-pre-wrap">{message.content}</BubbleContent>
          </Bubble>
        )}

        {isOwn && (
          <MessageFooter className="px-0 gap-1">
            {isRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
            )}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )

  return (
    <>
      {isOwn && onDelete ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="w-full min-w-0">{messageRow}</div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              variant="destructive"
              onClick={() => {
                onDelete(message.id)
              }}
            >
              <Trash2 />
              {t('messaging.deleteMessage')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        messageRow
      )}

      {message.type === 'image' && (
        <Dialog open={isImageViewerOpen} onOpenChange={handleImageViewerOpenChange}>
          <DialogContent className="max-w-5xl p-3 sm:p-4" showCloseButton={false}>
            <DialogHeader className="sr-only">
              <DialogTitle>{t('messaging.imageMessage')}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center justify-end gap-2 pb-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                aria-label={t('messaging.zoomOutImage')}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                aria-label={t('messaging.zoomInImage')}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  handleImageViewerOpenChange(false)
                }}
                aria-label={t('actions.close')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={message.content}
                alt={t('media:alt.chatImage')}
                className="max-w-full max-h-[75vh] object-contain transition-transform duration-150 motion-reduce:transition-none"
                style={{ transform: `scale(${String(zoomLevel)})` }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
