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
import type {
  Chat,
  ChatMessage,
  GetMsgChatsIdMessages200,
  PostMsgChatsBody,
  PostMsgChatsIdMessagesBody,
} from './generated/model'

/**
 * Get all chats for the current user
 */
export async function getChats(): Promise<Chat[]> {
  return await generatedGetChats()
}

/**
 * Create a new chat (direct message)
 */
export async function createChat(payload: PostMsgChatsBody): Promise<Chat> {
  return await generatedPostChats(payload)
}

/**
 * Get a specific chat
 */
export async function getChat(chatId: number): Promise<Chat> {
  return await generatedGetChat(chatId)
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
): Promise<GetMsgChatsIdMessages200> {
  return await generatedGetMessages(chatId, { cursor, limit })
}

/**
 * Send a message in a chat
 */
export async function sendMessage(
  chatId: number,
  payload: PostMsgChatsIdMessagesBody
): Promise<ChatMessage> {
  return await generatedSendMessage(chatId, payload)
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
