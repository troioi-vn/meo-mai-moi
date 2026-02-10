import React, { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CheckCheck, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/api/generated/model'
import { formatRelativeTime } from '@/utils/date'
import { getInitials } from '@/utils/initials'

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
  const initials = getInitials(sender.name)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
            </Avatar>
          )}
        </div>

        <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
          {/* Timestamp */}
          {showTimestamp && (
            <span className="text-xs text-muted-foreground mb-1 px-2">
              {formatRelativeTime(message.created_at)}
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
                <a href={message.content} target="_blank" rel="noopener noreferrer">
                  <img
                    src={message.content}
                    alt={t('messaging.imageMessage')}
                    className="max-h-64 rounded-lg object-cover"
                  />
                </a>
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
    </>
  )
}
