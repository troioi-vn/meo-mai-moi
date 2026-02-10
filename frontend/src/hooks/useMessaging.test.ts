import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatList, useChat } from './useMessaging'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import { mockChat, mockChatMessage } from '@/testing/mocks/data/messaging'

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1, name: 'User One' },
  }),
}))

describe('useMessaging hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useChatList', () => {
    it('fetches and returns chats', async () => {
      server.use(
        http.get('http://localhost:3000/api/msg/chats', () => {
          return HttpResponse.json({ data: [mockChat] })
        })
      )

      const { result } = renderHook(() => useChatList())

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.chats).toHaveLength(1)
        expect(result.current.chats[0]?.id).toBe(mockChat.id)
      })
    })

    it('handles errors when fetching chats', async () => {
      server.use(
        http.get('http://localhost:3000/api/msg/chats', () => {
          return new HttpResponse(null, { status: 500 })
        })
      )

      const { result } = renderHook(() => useChatList())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('Failed to load chats')
      })
    })
  })

  describe('useChat', () => {
    it('fetches chat details and messages', async () => {
      server.use(
        http.get('http://localhost:3000/api/msg/chats/1', () => {
          return HttpResponse.json({ data: mockChat })
        }),
        http.get('http://localhost:3000/api/msg/chats/1/messages', () => {
          return HttpResponse.json({
            data: [mockChatMessage],
            next_cursor: null,
          })
        }),
        http.post('http://localhost:3000/api/msg/chats/1/read', () => {
          return HttpResponse.json({ success: true })
        })
      )

      const { result } = renderHook(() => useChat(1))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.chat?.id).toBe(mockChat.id)
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0]?.id).toBe(mockChatMessage.id)
      })
    })

    it('calls markChatRead with numeric chat ID, not an object', async () => {
      let markReadCalledWithCorrectId = false

      server.use(
        http.get('http://localhost:3000/api/msg/chats/1', () => {
          return HttpResponse.json({ data: mockChat })
        }),
        http.get('http://localhost:3000/api/msg/chats/1/messages', () => {
          return HttpResponse.json({ data: [mockChatMessage], next_cursor: null })
        }),
        http.post('http://localhost:3000/api/msg/chats/1/read', () => {
          // This handler only matches if the URL has numeric ID "1"
          // If an object was passed, URL would be /msg/chats/[object Object]/read
          markReadCalledWithCorrectId = true
          return HttpResponse.json({ success: true })
        })
      )

      const { result } = renderHook(() => useChat(1))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await waitFor(() => {
        expect(markReadCalledWithCorrectId).toBe(true)
      })
    })

    it('sends message with correct arguments (id, body) not single object', async () => {
      let sendMessageCalledCorrectly = false
      let receivedContent = ''

      server.use(
        http.get('http://localhost:3000/api/msg/chats/1', () => {
          return HttpResponse.json({ data: mockChat })
        }),
        http.get('http://localhost:3000/api/msg/chats/1/messages', () => {
          return HttpResponse.json({ data: [], next_cursor: null })
        }),
        http.post('http://localhost:3000/api/msg/chats/1/read', () => {
          return HttpResponse.json({ success: true })
        }),
        http.post('http://localhost:3000/api/msg/chats/1/messages', async ({ request }) => {
          // This handler only matches if the URL has numeric ID "1"
          // If an object was passed as first arg, URL would be /msg/chats/[object Object]/messages
          sendMessageCalledCorrectly = true
          const body = (await request.json()) as { content: string }
          receivedContent = body.content
          return HttpResponse.json({
            data: {
              id: 101,
              chat_id: 1,
              sender: { id: 1, name: 'User One', avatar_url: null },
              type: 'text',
              content: body.content,
              is_mine: true,
              created_at: new Date().toISOString(),
            },
          })
        })
      )

      const { result } = renderHook(() => useChat(1))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Send a message
      await result.current.send('Hello, world!')

      await waitFor(() => {
        expect(sendMessageCalledCorrectly).toBe(true)
        expect(receivedContent).toBe('Hello, world!')
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0]?.content).toBe('Hello, world!')
      })
    })
  })

  // Nav badge unread count is covered by unified notifications context tests.
})
