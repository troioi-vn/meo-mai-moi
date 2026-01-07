import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/messaging'
import { formatRelativeTime } from '@/utils/date'

interface MessageBubbleProps {
  message: ChatMessage
  showAvatar: boolean
  showTimestamp: boolean
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
  showTimestamp,
}) => {
  const isOwn = message.is_mine
  const sender = message.sender
  const initials = sender.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn('flex gap-2 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
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
        <div
          className={cn(
            'px-4 py-2 rounded-2xl wrap-break-word whitespace-pre-wrap',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}
