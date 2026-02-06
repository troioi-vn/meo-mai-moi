import React from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Chat } from '@/api/generated/model'
import { formatRelativeTime } from '@/utils/date'
import { getInitials } from '@/utils/initials'
import { useAuth } from '@/hooks/use-auth'

interface ChatListProps {
  chats: Chat[]
  loading: boolean
  selectedChatId: number | null
  onSelectChat: (chatId: number) => void
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  loading,
  selectedChatId,
  onSelectChat,
}) => {
  const { t } = useTranslation('common')
  const { user } = useAuth()

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{t('messaging.title')}</h2>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <ChatListItemSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">{t('messaging.title')}</h2>
      </div>

      {chats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2 p-4">
            <MessageCircle className="h-12 w-12 mx-auto opacity-50" />
            <p>{t('messaging.noConversations')}</p>
            <p className="text-sm">{t('messaging.noConversationsHint')}</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isSelected={chat.id === selectedChatId}
                currentUserId={user?.id}
                onClick={() => {
                  onSelectChat(chat.id)
                }}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

interface ChatListItemProps {
  chat: Chat
  isSelected: boolean
  currentUserId?: number
  onClick: () => void
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isSelected, currentUserId, onClick }) => {
  const { t } = useTranslation('common')
  const otherParticipant = chat.participants?.find((p) => p.id !== currentUserId)
  const displayName = otherParticipant?.name ?? t('messaging.unknownUser')
  const avatarUrl = otherParticipant?.avatar_url ?? undefined
  const initials = getInitials(displayName)

  const lastMessage = chat.latest_message
  const hasUnread = (chat.unread_count ?? 0) > 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left transition-colors hover:bg-accent',
        isSelected && 'bg-accent',
        hasUnread && 'bg-accent/50'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('font-medium truncate', hasUnread && 'font-semibold')}>
              {displayName}
            </span>
            {lastMessage && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeTime(lastMessage.created_at ?? '')}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            {lastMessage ? (
              <p
                className={cn(
                  'text-sm truncate',
                  hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {lastMessage.content}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t('messaging.noMessages')}</p>
            )}

            {hasUnread && (
              <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs shrink-0">
                {(chat.unread_count ?? 0) > 99 ? '99+' : chat.unread_count}
              </Badge>
            )}
          </div>

          {chat.contextable_type && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('messaging.via')} {chat.contextable_type === 'PlacementRequest' ? t('messaging.viaPlacementRequest') : t('messaging.viaPet')}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

const ChatListItemSkeleton: React.FC = () => (
  <div className="flex items-start gap-3">
    <Skeleton className="h-12 w-12 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
)
