import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChatList } from '@/components/messaging/ChatList'
import { ChatWindow } from '@/components/messaging/ChatWindow'
import { useChatList, useChat } from '@/hooks/useMessaging'
import { cn } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

const MessagesPage: React.FC = () => {
  const { t } = useTranslation('common')
  const { chatId } = useParams<{ chatId?: string }>()
  const navigate = useNavigate()
  const { chats, loading: chatsLoading, refresh: refreshChats } = useChatList()
  const selectedChatId = chatId ? parseInt(chatId, 10) : null

  const {
    chat,
    messages,
    loading: chatLoading,
    sending,
    imageUploadProgress,
    hasMore,
    loadMore,
    send,
    sendImage,
    deleteMessage,
    counterpartyReadAt,
  } = useChat(selectedChatId)

  const handleSelectChat = (id: number) => {
    void navigate(`/messages/${String(id)}`)
    // Refresh chat list to update unread counts
    void refreshChats()
  }

  const handleBack = () => {
    void navigate('/messages')
    void refreshChats()
  }

  const handleSend = async (content: string) => {
    await send(content)
    void refreshChats()
  }

  const handleSendImage = async (file: File) => {
    await sendImage(file)
    void refreshChats()
  }

  // Mobile: Show chat list or chat window based on selection
  // Desktop: Show both side by side
  return (
    <div className="container mx-auto h-[calc(100vh-4rem)]">
      <div className="flex h-full">
        {/* Chat list - hidden on mobile when a chat is selected */}
        <div
          className={cn(
            'w-full md:w-80 lg:w-96 border-r shrink-0',
            selectedChatId ? 'hidden md:block' : 'block'
          )}
        >
          <ChatList
            chats={chats}
            loading={chatsLoading}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
          />
        </div>

        {/* Chat window - full width on mobile when selected */}
        <div className={cn('flex-1 flex flex-col', selectedChatId ? 'block' : 'hidden md:flex')}>
          {selectedChatId ? (
            <ChatWindow
              chat={chat}
              messages={messages}
              loading={chatLoading}
              sending={sending}
              imageUploadProgress={imageUploadProgress}
              hasMore={hasMore}
              counterpartyReadAt={counterpartyReadAt}
              onLoadMore={() => void loadMore()}
              onSend={handleSend}
              onSendImage={handleSendImage}
              onDeleteMessage={(id) => void deleteMessage(id)}
              onBack={handleBack}
            />
          ) : (
            <Empty className="flex-1 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageCircle />
                </EmptyMedia>
                <EmptyTitle>{t('messaging.selectConversation')}</EmptyTitle>
                <EmptyDescription>{t('messaging.selectConversationHint')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessagesPage
