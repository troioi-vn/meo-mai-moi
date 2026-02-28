import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CheckCheck, Trash2, ZoomIn, ZoomOut, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/api/generated/model'
import { formatRelativeTime } from '@/utils/date'
import { getInitials } from '@/utils/initials'
import { isPremiumUser } from '@/lib/premium-user'
import { PremiumAvatarBadge } from '@/components/user/PremiumAvatarBadge'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

interface MessageBubbleProps {
  message: ChatMessage
  showAvatar: boolean
  showTimestamp: boolean
  isRead?: boolean
  onDelete?: (messageId: number) => void
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
  showTimestamp,
  isRead,
  onDelete,
}) => {
  const { t } = useTranslation('common')
  const isOwn = message.is_mine
  const sender = message.sender
  const premiumAwareSender = sender as typeof sender & { is_premium?: boolean }
  const initials = getInitials(sender.name)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }, [])

  const showMenu = useCallback(
    (x: number, y: number) => {
      if (isOwn && onDelete) {
        setMenuPos({ x, y })
      }
    },
    [isOwn, onDelete]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!isOwn || !onDelete) return
      e.preventDefault()
      showMenu(e.clientX, e.clientY)
    },
    [isOwn, onDelete, showMenu]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isOwn || !onDelete) return
      const touch = e.touches[0]
      if (!touch) return
      longPressTimer.current = setTimeout(() => {
        showMenu(touch.clientX, touch.clientY)
      }, 500)
    },
    [isOwn, onDelete, showMenu]
  )

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleDelete = useCallback(() => {
    onDelete?.(message.id)
    setMenuPos(null)
  }, [onDelete, message.id])

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

  return (
    <>
      {/* Backdrop to close menu */}
      {menuPos && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setMenuPos(null)
          }}
        />
      )}

      <div
        className={cn('flex gap-2 group', isOwn ? 'flex-row-reverse' : 'flex-row')}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Avatar placeholder for alignment */}
        <div className="w-8 shrink-0">
          {showAvatar && !isOwn && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={sender.avatar_url ?? undefined} alt={sender.name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {initials}
              </AvatarFallback>
              {isPremiumUser(premiumAwareSender) && <PremiumAvatarBadge />}
            </Avatar>
          )}
        </div>

        <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
          {/* Timestamp */}
          {showTimestamp && (
            <span className="text-xs text-muted-foreground mb-1 px-2">
              {message.created_at ? formatRelativeTime(message.created_at) : ''}
            </span>
          )}

          {/* Message bubble */}
          <div className="relative">
            <div
              className={cn(
                'px-4 py-2 rounded-2xl wrap-break-word whitespace-pre-wrap',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              )}
            >
              {message.type === 'image' ? (
                <button
                  type="button"
                  className="block"
                  onClick={openImageViewer}
                  aria-label={t('messaging.openImageViewer')}
                >
                  <img
                    src={message.content}
                    alt={t('messaging.imageMessage')}
                    className="max-h-64 rounded-lg object-cover cursor-zoom-in"
                  />
                </button>
              ) : (
                message.content
              )}
            </div>

            {/* Read receipt indicator */}
            {isOwn && (
              <span className="absolute -bottom-0.5 -right-5">
                {isRead ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </span>
            )}

            {/* Context menu popover */}
            {menuPos && (
              <div
                className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-36"
                style={{ left: menuPos.x, top: menuPos.y }}
              >
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('messaging.deleteMessage')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
                alt={t('messaging.imageMessage')}
                className="max-w-full max-h-[75vh] object-contain transition-transform duration-150"
                style={{ transform: `scale(${String(zoomLevel)})` }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
