import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, MessageCircle, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Marker, MarkerContent } from '@/components/ui/marker'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { MessageComposer } from './MessageComposer'
import { MessageBubble } from './MessageBubble'
import type { Chat, ChatMessage } from '@/api/generated/model'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/utils/date'
import { getInitials } from '@/utils/initials'
import { useAuth } from '@/hooks/use-auth'
import { isPremiumUser } from '@/lib/premium-user'
import { PremiumAvatarBadge } from '@/components/user/PremiumAvatarBadge'

interface ChatWindowProps {
  chat: Chat | null
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  imageUploadProgress?: number | null
  hasMore: boolean
  counterpartyReadAt?: string | null
  onLoadMore: () => void
  onSend: (content: string) => Promise<void>
  onSendImage?: (file: File) => Promise<void>
  onDeleteMessage?: (messageId: number) => void
  onBack: () => void
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

function shouldShowTimestamp(message: ChatMessage, prevMessage?: ChatMessage): boolean {
  if (!prevMessage) return true
  if (!message.created_at || !prevMessage.created_at) return true
  return (
    new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() >
    FIVE_MINUTES_MS
  )
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  loading,
  sending,
  imageUploadProgress,
  hasMore,
  counterpartyReadAt,
  onLoadMore,
  onSend,
  onSendImage,
  onDeleteMessage,
  onBack,
}) => {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const otherParticipant = chat?.participants?.find((p) => p.id !== user?.id)
  const displayName = otherParticipant?.name ?? t('actions.loading')
  const avatarUrl = otherParticipant?.avatar_url ?? undefined
  const premiumAwareParticipant = otherParticipant
  const initials = getInitials(displayName)

  const transcriptItems = useMemo(() => {
    type TranscriptItem =
      | { kind: 'time'; id: string; label: string }
      | {
          kind: 'message'
          message: ChatMessage
          showAvatar: boolean
          isRead: boolean
        }

    const items: TranscriptItem[] = []

    for (const [index, message] of messages.entries()) {
      const prevMessage = messages[index - 1]
      const nextMessage = messages[index + 1]
      const showAvatar = !nextMessage || nextMessage.sender.id !== message.sender.id
      const isRead =
        message.is_mine &&
        !!counterpartyReadAt &&
        !!message.created_at &&
        new Date(message.created_at) <= new Date(counterpartyReadAt)

      if (shouldShowTimestamp(message, prevMessage)) {
        items.push({
          kind: 'time',
          id: `time-${String(message.id)}`,
          label: message.created_at ? formatRelativeTime(message.created_at) : '',
        })
      }

      items.push({ kind: 'message', message, showAvatar, isRead })
    }

    return items
  }, [messages, counterpartyReadAt])

  return (
    <div className="h-full flex flex-col">
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
            {isPremiumUser(premiumAwareParticipant) && <PremiumAvatarBadge />}
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          {loading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <h3 className="font-semibold line-clamp-1">{displayName}</h3>
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

      {loading ? (
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <MessageSkeleton key={i} isOwn={i % 2 === 0} />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <Empty className="flex-1 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircle />
            </EmptyMedia>
            <EmptyTitle>{t('messaging.noMessages')}</EmptyTitle>
            <EmptyDescription>{t('messaging.typePlaceholder')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="flex-1 min-h-0">
            <MessageScrollerViewport>
              <MessageScrollerContent className="gap-3 p-4" aria-busy={sending}>
                {hasMore && (
                  <MessageScrollerItem messageId="load-older" scrollAnchor={false}>
                    <div className="flex justify-center py-1">
                      <Button variant="ghost" size="sm" onClick={onLoadMore}>
                        {t('messaging.loadOlder')}
                      </Button>
                    </div>
                  </MessageScrollerItem>
                )}

                {transcriptItems.map((item) =>
                  item.kind === 'time' ? (
                    <MessageScrollerItem key={item.id} messageId={item.id} scrollAnchor={false}>
                      <Marker variant="separator" role="status">
                        <MarkerContent>{item.label}</MarkerContent>
                      </Marker>
                    </MessageScrollerItem>
                  ) : (
                    <MessageScrollerItem key={item.message.id} messageId={String(item.message.id)}>
                      <MessageBubble
                        message={item.message}
                        showAvatar={item.showAvatar}
                        isRead={item.isRead}
                        onDelete={onDeleteMessage}
                      />
                    </MessageScrollerItem>
                  )
                )}

                {sending && (
                  <MessageScrollerItem messageId="sending" scrollAnchor={false}>
                    <Marker role="status">
                      <MarkerContent className="shimmer ml-auto">
                        {t('messaging.sending')}
                      </MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton>
              <ArrowDown />
              <span className="sr-only">{t('messaging.scrollToLatest')}</span>
            </MessageScrollerButton>
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      <div className="border-t bg-background">
        <MessageComposer
          onSend={onSend}
          onSendImage={onSendImage}
          disabled={loading || sending}
          imageUploadProgress={imageUploadProgress}
        />
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
