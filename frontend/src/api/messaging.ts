import { api } from '@/api/axios'
import type {
  Chat,
  ChatMessage,
  CreateChatPayload,
  MessagesResponse,
  SendMessagePayload,
  UnreadCountResponse,
} from '@/types/messaging'

/**
 * Get all chats for the current user
 */
export async function getChats(): Promise<Chat[]> {
  return await api.get<Chat[]>('/msg/chats')
}

/**
 * Create a new chat (direct message)
 */
export async function createChat(payload: CreateChatPayload): Promise<Chat> {
  return await api.post<Chat>('/msg/chats', payload)
}

/**
 * Get a specific chat
 */
export async function getChat(chatId: number): Promise<Chat> {
  return await api.get<Chat>(`/msg/chats/${String(chatId)}`)
}

/**
 * Delete/leave a chat
 */
export async function deleteChat(chatId: number): Promise<void> {
  await api.delete(`/msg/chats/${String(chatId)}`)
}

/**
 * Mark a chat as read
 */
export async function markChatRead(chatId: number): Promise<void> {
  await api.post(`/msg/chats/${String(chatId)}/read`)
}

/**
 * Get messages in a chat (with cursor pagination)
 */
export async function getMessages(
  chatId: number,
  cursor?: string,
  limit = 50
): Promise<MessagesResponse> {
  const params: Record<string, string | number> = { limit }
  if (cursor) {
    params.cursor = cursor
  }
  return await api.get<MessagesResponse>(`/msg/chats/${String(chatId)}/messages`, {
    params,
  })
}

/**
 * Send a message in a chat
 */
export async function sendMessage(
  chatId: number,
  payload: SendMessagePayload
): Promise<ChatMessage> {
  return await api.post<ChatMessage>(`/msg/chats/${String(chatId)}/messages`, payload)
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: number): Promise<void> {
  await api.delete(`/msg/messages/${String(messageId)}`)
}

/**
 * Get unread message count (legacy endpoint)
 */
export async function getUnreadChatsCount(): Promise<number> {
  const res = await api.get<UnreadCountResponse>('/msg/unread-count')
  return res.unread_message_count
}

/**
 * Create or find an existing direct chat with a user
 */
export async function createDirectChat(
  recipientId: number,
  contextableType?: 'PlacementRequest' | 'Pet',
  contextableId?: number
): Promise<Chat> {
  const payload: CreateChatPayload = {
    type: 'direct',
    recipient_id: recipientId,
    ...(contextableType && contextableId
      ? { contextable_type: contextableType, contextable_id: contextableId }
      : {}),
  }
  return createChat(payload)
}
