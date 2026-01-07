import React from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Chat } from '@/types/messaging'
import { formatRelativeTime } from '@/utils/date'

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
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Messages</h2>
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
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>

      {chats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2 p-4">
            <MessageCircle className="h-12 w-12 mx-auto opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a conversation from a placement request</p>
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
  onClick: () => void
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isSelected, onClick }) => {
  const otherParticipant = chat.other_participant
  const displayName = otherParticipant?.name ?? 'Unknown'
  const avatarUrl = otherParticipant?.avatar_url ?? undefined
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const lastMessage = chat.latest_message
  const hasUnread = chat.unread_count > 0

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
        <Avatar className="h-12 w-12 flex-shrink-0">
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
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatRelativeTime(lastMessage.created_at)}
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
                {lastMessage.sender_name && `${lastMessage.sender_name}: `}
                {lastMessage.content}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No messages yet</p>
            )}

            {hasUnread && (
              <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                {chat.unread_count > 99 ? '99+' : chat.unread_count}
              </Badge>
            )}
          </div>

          {chat.contextable_type && (
            <p className="text-xs text-muted-foreground mt-1">
              via {chat.contextable_type === 'PlacementRequest' ? 'Placement Request' : 'Pet'}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

const ChatListItemSkeleton: React.FC = () => (
  <div className="flex items-start gap-3">
    <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
)
