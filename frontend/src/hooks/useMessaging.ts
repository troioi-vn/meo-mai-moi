import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getEcho } from '@/lib/echo'
import type { Channel } from 'laravel-echo'
import {
  getMsgChats as getChats,
  getMsgChatsId as getChat,
  getMsgChatsIdMessages as getMessages,
  postMsgChatsIdMessages as sendMessage,
  postMsgChatsIdRead as markChatRead,
  postMsgChats as createDirectChat,
  deleteMsgMessagesId as deleteMessageApi,
} from '@/api/generated/messaging/messaging'
import type { Chat, ChatMessage } from '@/api/generated/model'
import { useNotifications } from '@/contexts/NotificationProvider'
import { uploadMedia } from '@/lib/media-upload-service'

const MESSAGE_SENT_EVENT = '.App\\Events\\MessageSent'
const MESSAGE_DELETED_EVENT = '.App\\Events\\MessageDeleted'
const MESSAGES_READ_EVENT = '.App\\Events\\MessagesRead'

function isChatMessagePayload(data: unknown): data is ChatMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof data.id === 'number' &&
    'chat_id' in data &&
    typeof (data as { chat_id: unknown }).chat_id === 'number'
  )
}

/**
 * Hook for managing the chat list
 */
export function useChatList() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuth()
  const refreshRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await getChats()
      setChats(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch chats:', err)
      setError('Failed to load chats')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  refreshRef.current = refresh

  useEffect(() => {
    if (isAuthenticated) {
      void refresh()
    } else {
      setChats([])
      setLoading(false)
    }
  }, [isAuthenticated, refresh])

  // Listen for updates via Echo (only if configured)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    const userId = user.id
    let active = true
    let channel: Channel | null = null
    const onMessageSent = () => {
      if (active) void refreshRef.current()
    }

    const setupEcho = async () => {
      const echoInstance = await getEcho()
      if (!echoInstance || !active) return

      channel = echoInstance.private(`App.Models.User.${userId.toString()}`)
      channel.listen(MESSAGE_SENT_EVENT, onMessageSent)
    }

    void setupEcho()

    return () => {
      active = false
      if (channel) {
        channel.stopListening(MESSAGE_SENT_EVENT, onMessageSent)
      }
    }
  }, [isAuthenticated, user?.id])

  return { chats, loading, error, refresh }
}

/**
 * Hook for managing a single chat conversation
 */
export function useChat(chatId: number | null) {
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [counterpartyReadAt, setCounterpartyReadAt] = useState<string | null>(null)
  const cursorRef = useRef<string | null>(null)
  const hasLoadedRef = useRef(false)
  const { isAuthenticated, user } = useAuth()
  const { refresh: refreshNotifications } = useNotifications()
  const refreshNotificationsRef = useRef(refreshNotifications)
  refreshNotificationsRef.current = refreshNotifications

  const appendMessage = useCallback((event: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === event.id)) return prev
      return [...prev, event]
    })
  }, [])

  // Load chat details and initial messages
  const loadChat = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!chatId || !isAuthenticated) return

      const silent = opts?.silent && hasLoadedRef.current
      if (!silent) {
        setLoading(true)
      }
      setError(null)

      try {
        const [chatData, messagesData] = await Promise.all([getChat(chatId), getMessages(chatId)])

        setChat(chatData)
        // Messages come in reverse chronological order, reverse them for display
        if (Array.isArray(messagesData)) {
          setMessages([...(messagesData as ChatMessage[])].reverse())
          setHasMore(false)
          setCounterpartyReadAt(null)
          cursorRef.current = null
        } else {
          const data = messagesData
          setMessages([...(data.data ?? [])].reverse())
          setHasMore(!!data.meta?.next_cursor)
          setCounterpartyReadAt(data.meta?.counterparty_read_at ?? null)
          cursorRef.current = data.meta?.next_cursor ?? null
        }

        hasLoadedRef.current = true

        // Mark as read and refresh notification counts
        await markChatRead(chatId)
        void refreshNotificationsRef.current()
      } catch (err) {
        console.error('Failed to load chat:', err)
        setError('Failed to load conversation')
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [chatId, isAuthenticated]
  )

  useEffect(() => {
    hasLoadedRef.current = false
    void (async () => {
      if (chatId) {
        await loadChat()
      } else {
        setChat(null)
        setMessages([])
        setLoading(false)
      }
    })()
  }, [chatId, loadChat])

  // Catch up after reconnects / missed websocket events
  useEffect(() => {
    if (!chatId || !isAuthenticated) return

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadChat({ silent: true })
      }
    }

    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [chatId, isAuthenticated, loadChat])

  // Load more messages (older)
  const loadMore = useCallback(async () => {
    if (!chatId || !hasMore || loadingMore || !cursorRef.current) return

    setLoadingMore(true)
    try {
      const messagesData = await getMessages(chatId, { cursor: cursorRef.current || undefined })
      // Prepend older messages (they're in reverse chrono order)
      if (Array.isArray(messagesData)) {
        setMessages((prev) => [...[...(messagesData as ChatMessage[])].reverse(), ...prev])
        setHasMore(false)
        cursorRef.current = null
      } else {
        const data = messagesData as {
          data?: ChatMessage[]
          meta?: { next_cursor?: string | null }
          next_cursor?: string | null
        }
        setMessages((prev) => [...[...(data.data ?? [])].reverse(), ...prev])
        const nextCursor = data.meta?.next_cursor ?? data.next_cursor ?? null
        setHasMore(!!nextCursor)
        cursorRef.current = nextCursor
      }
    } catch (err) {
      console.error('Failed to load more messages:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [chatId, hasMore, loadingMore])

  // Send a message
  const send = useCallback(
    async (content: string) => {
      if (!chatId || !content.trim() || sending) return

      setSending(true)
      try {
        const newMessage = await sendMessage(chatId, { type: 'text', content: content.trim() })
        setMessages((prev) => [...prev, newMessage])
      } catch (err) {
        console.error('Failed to send message:', err)
        throw err
      } finally {
        setSending(false)
      }
    },
    [chatId, sending]
  )

  // Send an image message
  const sendImage = useCallback(
    async (file: File) => {
      if (!chatId || sending) return

      setSending(true)
      setImageUploadProgress(0)
      try {
        const newMessage = (await uploadMedia({ kind: 'chat-image', chatId }, file, (progress) => {
          setImageUploadProgress(progress)
        })) as ChatMessage
        setMessages((prev) => [...prev, newMessage])
      } catch (err) {
        console.error('Failed to send image:', err)
        throw err
      } finally {
        setSending(false)
        setImageUploadProgress(null)
      }
    },
    [chatId, sending]
  )

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId: number) => {
      if (!chatId) return
      try {
        await deleteMessageApi(messageId)
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
      } catch (err) {
        console.error('Failed to delete message:', err)
        throw err
      }
    },
    [chatId]
  )

  // Listen for new messages and deletions via Echo (only if configured)
  useEffect(() => {
    if (!chatId || !isAuthenticated) return

    const currentUserId = user?.id
    let active = true
    let chatChannel: Channel | null = null
    let userChannel: Channel | null = null
    let echoInstance: Awaited<ReturnType<typeof getEcho>> = null

    const onMessageSent = (data: unknown) => {
      if (!active || !isChatMessagePayload(data)) return
      if (data.chat_id !== chatId) return

      appendMessage(data)
      void markChatRead(chatId).then(() => refreshNotificationsRef.current())
    }

    const onMessageDeleted = (data: unknown) => {
      if (!active) return
      const event = data as { id?: number; chat_id?: number }
      if (typeof event.id !== 'number') return
      if (typeof event.chat_id === 'number' && event.chat_id !== chatId) return
      setMessages((prev) => prev.filter((m) => m.id !== event.id))
    }

    const onMessagesRead = (data: unknown) => {
      if (!active) return
      const event = data as { chat_id?: number; user_id?: number; read_at?: string }
      if (event.chat_id !== chatId) return
      if (event.user_id === currentUserId) return
      if (typeof event.read_at === 'string') {
        setCounterpartyReadAt(event.read_at)
      }
    }

    const setupEcho = async () => {
      echoInstance = await getEcho()
      if (!echoInstance || !active) return

      chatChannel = echoInstance.private(`chat.${chatId.toString()}`)
      chatChannel.listen(MESSAGE_SENT_EVENT, onMessageSent)
      chatChannel.listen(MESSAGE_DELETED_EVENT, onMessageDeleted)
      chatChannel.listen(MESSAGES_READ_EVENT, onMessagesRead)

      // User channel is a backup if the chat-channel subscription fails/lags.
      if (currentUserId) {
        userChannel = echoInstance.private(`App.Models.User.${currentUserId.toString()}`)
        userChannel.listen(MESSAGE_SENT_EVENT, onMessageSent)
      }
    }

    void setupEcho()

    return () => {
      active = false
      if (chatChannel) {
        chatChannel.stopListening(MESSAGE_SENT_EVENT, onMessageSent)
        chatChannel.stopListening(MESSAGE_DELETED_EVENT, onMessageDeleted)
        chatChannel.stopListening(MESSAGES_READ_EVENT, onMessagesRead)
      }
      if (userChannel) {
        userChannel.stopListening(MESSAGE_SENT_EVENT, onMessageSent)
      }
      if (echoInstance) {
        echoInstance.leave(`chat.${chatId.toString()}`)
      }
    }
  }, [appendMessage, chatId, isAuthenticated, user?.id])

  return {
    chat,
    messages,
    loading,
    loadingMore,
    sending,
    imageUploadProgress,
    error,
    hasMore,
    counterpartyReadAt,
    loadMore,
    send,
    sendImage,
    deleteMessage,
    refresh: loadChat,
  }
}

/**
 * Hook for creating a new direct chat
 */
export function useCreateChat() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (
      recipientId: number,
      contextableType?: 'PlacementRequest' | 'Pet',
      contextableId?: number
    ): Promise<Chat | null> => {
      setCreating(true)
      setError(null)

      try {
        const chat = (await createDirectChat({
          type: 'direct',
          recipient_id: recipientId,
          contextable_type: contextableType,
          contextable_id: contextableId,
        })) as Chat
        return chat
      } catch (err) {
        console.error('Failed to create chat:', err)
        setError('Failed to start conversation')
        return null
      } finally {
        setCreating(false)
      }
    },
    []
  )

  return { create, creating, error }
}
