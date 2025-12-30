export type ChatType = 'direct' | 'private_group' | 'public_group'
export type ContextableType = 'PlacementRequest' | 'Pet'

export interface ChatParticipant {
  id: number
  name: string
  avatar_url: string | null
}

export interface ChatLatestMessage {
  id: number
  content: string
  sender_name: string | null
  created_at: string
}

export interface Chat {
  id: number
  type: ChatType
  contextable_type: ContextableType | null
  contextable_id: number | null
  participants: ChatParticipant[]
  other_participant: ChatParticipant | null
  latest_message: ChatLatestMessage | null
  unread_count: number
  created_at: string
  updated_at: string
}

export interface MessageSender {
  id: number
  name: string
  avatar_url: string | null
}

export interface ChatMessage {
  id: number
  chat_id: number
  sender: MessageSender
  type: 'text'
  content: string
  is_mine: boolean
  created_at: string
}

export interface MessagesResponse {
  data: ChatMessage[]
  meta: {
    has_more: boolean
    next_cursor: string | null
  }
}

export interface CreateChatPayload {
  type: ChatType
  recipient_id: number
  contextable_type?: ContextableType
  contextable_id?: number
}

export interface SendMessagePayload {
  content: string
}

export interface UnreadCountResponse {
  unread_chats_count: number
}


