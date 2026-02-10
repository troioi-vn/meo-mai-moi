import type { Chat, ChatMessage } from '@/api/generated/model'

export const mockChat: Chat = {
  id: 1,
  type: 'direct',
  contextable_type: 'PlacementRequest',
  contextable_id: 10,
  created_at: '2025-12-31T09:00:00Z',
  updated_at: '2025-12-31T10:00:00Z',
  participants: [
    { id: 1, name: 'User One', avatar_url: null },
    { id: 2, name: 'User Two', avatar_url: null },
  ],
  latest_message: {
    id: 100,
    chat_id: 1,
    sender: { id: 2, name: 'User Two', avatar_url: null },
    type: 'text',
    content: 'Hello there!',
    is_mine: false,
    created_at: '2025-12-31T10:00:00Z',
  },
  unread_count: 1,
}

export const mockChatMessage: ChatMessage = {
  id: 100,
  chat_id: 1,
  sender: { id: 2, name: 'User Two', avatar_url: null },
  type: 'text',
  content: 'Hello there!',
  is_mine: false,
  created_at: '2025-12-31T10:00:00Z',
}
