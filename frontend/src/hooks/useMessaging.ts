import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getEcho } from '@/lib/echo'
import type { Channel } from 'laravel-echo'
import {
  getMsgChats as getChats,
  getMsgChatsId as getChat,
  getMsgChatsIdMessages as getMessages,
  postMsgChatsIdMessagesWithJson as sendMessage,
  postMsgChatsIdRead as markChatRead,
  postMsgChats as createDirectChat,
  deleteMsgMessagesId as deleteMessageApi,
} from '@/api/generated/messaging/messaging'
import { api } from '@/api/axios'
import type { Chat, ChatMessage } from '@/api/generated/model'

/**
 * Hook for managing the chat list
 */
export function useChatList() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, user } = useAuth()

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
    if (!isAuthenticated || !user) return

    let active = true
    let channel: Channel | null = null

    const setupEcho = async () => {
      const echoInstance = await getEcho()
      if (!echoInstance || !active) return

      channel = echoInstance.private(`App.Models.User.${user.id.toString()}`)
      channel.listen('.App\\Events\\MessageSent', () => {
        if (active) void refresh()
      })
    }

    void setupEcho()

    return () => {
      active = false
      if (channel) {
        channel.stopListening('.App\\Events\\MessageSent')
      }
    }
  }, [isAuthenticated, user, refresh])

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
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [counterpartyReadAt, setCounterpartyReadAt] = useState<string | null>(null)
  const cursorRef = useRef<string | null>(null)
  const { isAuthenticated, user } = useAuth()

  // Load chat details and initial messages
  const loadChat = useCallback(async () => {
    if (!chatId || !isAuthenticated) return

    setLoading(true)
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
        const data = messagesData as {
          data?: ChatMessage[]
          meta?: { next_cursor?: string | null; counterparty_read_at?: string | null }
        }
        setMessages([...(data.data ?? [])].reverse())
        setHasMore(!!data.meta?.next_cursor)
        setCounterpartyReadAt(data.meta?.counterparty_read_at ?? null)
        cursorRef.current = data.meta?.next_cursor ?? null
      }

      // Mark as read
      await markChatRead(chatId)
    } catch (err) {
      console.error('Failed to load chat:', err)
      setError('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [chatId, isAuthenticated])

  useEffect(() => {
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
        const data = messagesData as { data?: ChatMessage[]; next_cursor?: string | null }
        setMessages((prev) => [...[...(data.data ?? [])].reverse(), ...prev])
        setHasMore(!!data.next_cursor)
        cursorRef.current = data.next_cursor ?? null
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
      try {
        const formData = new FormData()
        formData.append('type', 'image')
        formData.append('image', file)

        const response = await api.post<ChatMessage>(
          `/msg/chats/${String(chatId)}/messages`,
          formData
        )
        const newMessage = response
        setMessages((prev) => [...prev, newMessage])
      } catch (err) {
        console.error('Failed to send image:', err)
        throw err
      } finally {
        setSending(false)
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

    let active = true
    let channel: Channel | null = null

    const setupEcho = async () => {
      const echoInstance = await getEcho()
      if (!echoInstance || !active) return

      channel = echoInstance.private(`chat.${chatId.toString()}`)
      channel.listen('.App\\Events\\MessageSent', (data: unknown) => {
        if (!active) return
        const event = data as ChatMessage
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === event.id)) return prev
          return [...prev, event]
        })

        // Mark as read
        void markChatRead(chatId)
      })
      channel.listen('.App\\Events\\MessageDeleted', (data: unknown) => {
        if (!active) return
        const event = data as { id: number; chat_id: number }
        setMessages((prev) => prev.filter((m) => m.id !== event.id))
      })
      channel.listen('.App\\Events\\MessagesRead', (data: unknown) => {
        if (!active) return
        const event = data as { chat_id: number; user_id: number; read_at: string }
        if (event.user_id === user?.id) return
        setCounterpartyReadAt(event.read_at)
      })
    }

    void setupEcho()

    return () => {
      active = false
      if (channel) {
        channel.stopListening('.App\\Events\\MessageSent')
        channel.stopListening('.App\\Events\\MessageDeleted')
        channel.stopListening('.App\\Events\\MessagesRead')
      }
    }
  }, [chatId, isAuthenticated, user])

  return {
    chat,
    messages,
    loading,
    loadingMore,
    sending,
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
