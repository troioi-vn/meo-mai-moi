import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getEcho } from '@/lib/echo'
import {
  getChats,
  getChat,
  getMessages,
  sendMessage,
  markChatRead,
  createDirectChat,
  getUnreadChatsCount,
} from '@/api/messaging'
import type { Chat, ChatMessage } from '@/types/messaging'

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

    const echoInstance = getEcho()
    if (!echoInstance) return // Reverb not configured

    const channel = echoInstance.private(`App.Models.User.${user.id.toString()}`)
    channel.listen('.App\\Events\\MessageSent', () => {
      void refresh()
    })

    return () => {
      channel.stopListening('.App\\Events\\MessageSent')
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
  const cursorRef = useRef<string | null>(null)
  const { isAuthenticated } = useAuth()

  // Load chat details and initial messages
  const loadChat = useCallback(async () => {
    if (!chatId || !isAuthenticated) return

    setLoading(true)
    setError(null)

    try {
      const [chatData, messagesData] = await Promise.all([getChat(chatId), getMessages(chatId)])

      setChat(chatData)
      // Messages come in reverse chronological order, reverse them for display
      setMessages(messagesData.data.reverse())
      setHasMore(messagesData.meta.has_more)
      cursorRef.current = messagesData.meta.next_cursor

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
      const messagesData = await getMessages(chatId, cursorRef.current)
      // Prepend older messages (they're in reverse chrono order)
      setMessages((prev) => [...messagesData.data.reverse(), ...prev])
      setHasMore(messagesData.meta.has_more)
      cursorRef.current = messagesData.meta.next_cursor
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
        const newMessage = await sendMessage(chatId, { content: content.trim() })
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

  // Listen for new messages via Echo (only if configured)
  useEffect(() => {
    if (!chatId || !isAuthenticated) return

    const echoInstance = getEcho()
    if (!echoInstance) return // Reverb not configured

    const channel = echoInstance.private(`chat.${chatId.toString()}`)
    channel.listen('.App\\Events\\MessageSent', (event: ChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === event.id)) return prev
        return [...prev, event]
      })

      // Mark as read
      void markChatRead(chatId)
    })

    return () => {
      channel.stopListening('.App\\Events\\MessageSent')
    }
  }, [chatId, isAuthenticated])

  return {
    chat,
    messages,
    loading,
    loadingMore,
    sending,
    error,
    hasMore,
    loadMore,
    send,
    refresh: loadChat,
  }
}

/**
 * Hook for unread chats count (for nav badge)
 */
export function useUnreadChatsCount() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, user } = useAuth()

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0)
      return
    }

    try {
      const unreadCount = await getUnreadChatsCount()
      setCount(unreadCount)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && user) {
      void refresh()
    } else {
      setCount(0)
      setLoading(false)
    }
  }, [isAuthenticated, user, refresh])

  // Listen for updates via Echo (only if configured)
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const echoInstance = getEcho()
    if (!echoInstance) return // Reverb not configured

    const channel = echoInstance.private(`App.Models.User.${user.id.toString()}`)
    channel.listen('.App\\Events\\MessageSent', () => {
      void refresh()
    })

    return () => {
      channel.stopListening('.App\\Events\\MessageSent')
    }
  }, [isAuthenticated, user, refresh])

  return { count, loading, refresh }
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
        const chat = await createDirectChat(recipientId, contextableType, contextableId)
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
