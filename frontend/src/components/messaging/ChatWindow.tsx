import React, { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageComposer } from './MessageComposer'
import { MessageBubble } from './MessageBubble'
import type { Chat, ChatMessage } from '@/api/generated/model'
import { cn } from '@/lib/utils'
import { getInitials } from '@/utils/initials'
import { useAuth } from '@/hooks/use-auth'

interface ChatWindowProps {
  chat: Chat | null
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSend: (content: string) => Promise<void>
  onBack: () => void
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  loading,
  sending,
  hasMore,
  onLoadMore,
  onSend,
  onBack,
}) => {
  const { t } = useTranslation('common')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousMessagesLengthRef = useRef(messages.length)

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current) {
      // New message added, scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    previousMessagesLengthRef.current = messages.length
  }, [messages.length])

  // Initial scroll to bottom
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView()
    }
  }, [loading, messages.length])

  const { user } = useAuth()
  const otherParticipant = chat?.participants?.find((p) => p.id !== user?.id)
  const displayName = otherParticipant?.name ?? t('actions.loading')
  const avatarUrl = otherParticipant?.avatar_url ?? undefined
  const initials = getInitials(displayName)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden shrink-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {loading ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : (
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          {loading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <h3 className="font-semibold truncate">{displayName}</h3>
              {chat?.contextable_type && chat.contextable_id && (
                <p className="text-xs text-muted-foreground">
                  {t('messaging.via')}{' '}
                  {chat.contextable_type === 'PlacementRequest' ? (
                    <Link
                      to={`/requests/${String(chat.contextable_id)}`}
                      className="hover:text-primary transition-colors underline-offset-2 hover:underline"
                    >
                      {t('messaging.viaPlacementRequest')}
                    </Link>
                  ) : (
                    <Link
                      to={`/pets/${String(chat.contextable_id)}/view`}
                      className="hover:text-primary transition-colors underline-offset-2 hover:underline"
                    >
                      {t('messaging.viaPet')}
                    </Link>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <MessageSkeleton key={i} isOwn={i % 2 === 0} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center py-2">
                <Button variant="ghost" size="sm" onClick={onLoadMore}>
                  {t('messaging.loadOlder')}
                </Button>
              </div>
            )}

            {/* Messages */}
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1]
              const showAvatar = prevMessage?.sender_id !== message.sender_id
              const showTimestamp =
                !prevMessage ||
                (message.created_at && prevMessage.created_at
                  ? new Date(message.created_at).getTime() -
                      new Date(prevMessage.created_at).getTime() >
                    5 * 60 * 1000
                  : true) // 5 minutes

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showAvatar={showAvatar}
                  showTimestamp={showTimestamp}
                />
              )
            })}

            {/* Sending indicator */}
            {sending && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 text-muted-foreground text-sm px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('messaging.sending')}
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <div className="border-t bg-background">
        <MessageComposer onSend={onSend} disabled={loading || sending} />
      </div>
    </div>
  )
}

const MessageSkeleton: React.FC<{ isOwn: boolean }> = ({ isOwn }) => (
  <div className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
    <Skeleton className={cn('h-12 rounded-2xl', isOwn ? 'w-48' : 'w-64')} />
  </div>
)
