import type { Chat, ChatMessage, User } from "@/api/generated/model";

const makeUser = (id: number, name: string): User => ({
  id,
  name,
  email: `user${String(id)}@example.com`,
  avatar_url: null,
  storage_used_bytes: 0,
  storage_limit_bytes: 0,
  is_premium: false,
  is_banned: false,
  banned_at: null,
  ban_reason: null,
  has_password: true,
  created_at: "2025-12-31T09:00:00Z",
  updated_at: "2025-12-31T10:00:00Z",
});

export const mockChat: Chat = {
  id: 1,
  type: "direct",
  contextable_type: "PlacementRequest",
  contextable_id: 10,
  created_at: "2025-12-31T09:00:00Z",
  updated_at: "2025-12-31T10:00:00Z",
  participants: [makeUser(1, "User One"), makeUser(2, "User Two")],
  latest_message: {
    id: 100,
    chat_id: 1,
    sender: makeUser(2, "User Two"),
    type: "text",
    content: "Hello there!",
    is_mine: false,
    created_at: "2025-12-31T10:00:00Z",
  },
  unread_count: 1,
};

export const mockChatMessage: ChatMessage = {
  id: 100,
  chat_id: 1,
  sender: makeUser(2, "User Two"),
  type: "text",
  content: "Hello there!",
  is_mine: false,
  created_at: "2025-12-31T10:00:00Z",
};
