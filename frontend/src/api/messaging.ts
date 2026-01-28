import {
  getMsgChats as generatedGetChats,
  postMsgChats as generatedPostChats,
  getMsgChatsId as generatedGetChat,
  deleteMsgChatsId as generatedDeleteChat,
  postMsgChatsIdRead as generatedMarkChatRead,
  getMsgChatsIdMessages as generatedGetMessages,
  postMsgChatsIdMessages as generatedSendMessage,
  deleteMsgMessagesId as generatedDeleteMessage,
  getMsgUnreadCount as generatedGetUnreadCount,
} from './generated/messaging/messaging'
import type { PostMsgChatsBody, PostMsgChatsIdMessagesBody } from './generated/model'
import type { Chat, ChatMessage, MessagesResponse } from '@/types/messaging'

/**
 * Get all chats for the current user
 */
export async function getChats(): Promise<Chat[]> {
  return (await generatedGetChats()) as unknown as Chat[]
}

/**
 * Create a new chat (direct message)
 */
export async function createChat(payload: PostMsgChatsBody): Promise<Chat> {
  return (await generatedPostChats(payload)) as unknown as Chat
}

/**
 * Get a specific chat
 */
export async function getChat(chatId: number): Promise<Chat> {
  return (await generatedGetChat(chatId)) as unknown as Chat
}

/**
 * Delete/leave a chat
 */
export async function deleteChat(chatId: number): Promise<void> {
  await generatedDeleteChat(chatId)
}

/**
 * Mark a chat as read
 */
export async function markChatRead(chatId: number): Promise<void> {
  await generatedMarkChatRead(chatId)
}

/**
 * Get messages in a chat (with cursor pagination)
 */
export async function getMessages(
  chatId: number,
  cursor?: string,
  limit = 50
): Promise<MessagesResponse> {
  const res = await generatedGetMessages(chatId, { cursor, limit })
  return {
    data: (res.data ?? []) as unknown as ChatMessage[],
    meta: {
      has_more: !!res.next_cursor,
      next_cursor: res.next_cursor ?? null,
    },
  }
}

/**
 * Send a message in a chat
 */
export async function sendMessage(
  chatId: number,
  payload: PostMsgChatsIdMessagesBody
): Promise<ChatMessage> {
  return (await generatedSendMessage(chatId, payload)) as unknown as ChatMessage
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: number): Promise<void> {
  await generatedDeleteMessage(messageId)
}

/**
 * Get unread message count
 */
export async function getUnreadChatsCount(): Promise<number> {
  const res = await generatedGetUnreadCount()
  return res.unread_message_count ?? 0
}

/**
 * Create or find an existing direct chat with a user
 */
export async function createDirectChat(
  recipientId: number,
  contextableType?: 'PlacementRequest' | 'Pet',
  contextableId?: number
): Promise<Chat> {
  const payload: PostMsgChatsBody = {
    type: 'direct',
    recipient_id: recipientId,
    ...(contextableType && contextableId
      ? { contextable_type: contextableType, contextable_id: contextableId }
      : {}),
  }
  return createChat(payload)
}
