import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatList, useChat, useUnreadChatsCount } from './useMessaging'
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
        expect(result.current.chats[0].id).toBe(mockChat.id)
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
            data: {
              data: [mockChatMessage],
              meta: { has_more: false, next_cursor: null },
            },
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
        expect(result.current.messages[0].id).toBe(mockChatMessage.id)
      })
    })
  })

  describe('useUnreadChatsCount', () => {
    it('fetches and returns unread count', async () => {
      server.use(
        http.get('http://localhost:3000/api/msg/unread-count', () => {
          return HttpResponse.json({ data: { unread_chats_count: 5 } })
        })
      )

      const { result } = renderHook(() => useUnreadChatsCount())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.count).toBe(5)
      })
    })
  })
})
