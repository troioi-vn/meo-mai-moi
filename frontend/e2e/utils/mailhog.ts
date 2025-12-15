/**
 * MailHog API utilities for E2E testing
 * Provides methods to interact with MailHog's REST API to retrieve and verify emails
 */

export interface MailHogMessage {
  ID: string
  From: { Relays: null; Mailbox: string; Domain: string; Params: string }
  To: Array<{ Relays: null; Mailbox: string; Domain: string; Params: string }>
  Content: {
    Headers: Record<string, string[]>
    Body: string
    Size: number
    MIME: null
  }
  Created: string
  MIME: null
  Raw: {
    From: string
    To: string[]
    Data: string
    Helo: string
  }
}

export interface MailHogResponse {
  total: number
  count: number
  start: number
  items: MailHogMessage[]
}

export class MailHogClient {
  private baseUrl: string

  constructor(baseUrl = process.env.MAILHOG_API_URL || 'http://localhost:8025/api/v2') {
    this.baseUrl = baseUrl
  }

  /**
   * Get all messages from MailHog
   */
  async getMessages(): Promise<MailHogResponse> {
    const response = await fetch(`${this.baseUrl}/messages`)
    if (!response.ok) {
      throw new Error(`MailHog API error: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Get messages for a specific email address
   */
  async getMessagesForEmail(email: string): Promise<MailHogMessage[]> {
    const messages = await this.getMessages()
    return messages.items.filter((msg) =>
      msg.To.some((to) => `${to.Mailbox}@${to.Domain}` === email)
    )
  }

  /**
   * Get the latest message for a specific email address
   */
  async getLatestMessageForEmail(email: string): Promise<MailHogMessage | null> {
    const messages = await this.getMessagesForEmail(email)
    return messages.length > 0 ? messages[0] : null
  }

  /**
   * Extract verification URL from email content
   * Looks for Laravel's default email verification URL pattern
   */
  extractVerificationUrl(message: MailHogMessage): string | null {
    const body = message.Content.Body

    // Look for verification URL patterns
    const urlPatterns = [
      /https?:\/\/[^\/\s]+\/email\/verify\/\d+\/[a-zA-Z0-9]+\?expires=\d+&signature=[a-zA-Z0-9%]+/g,
      /https?:\/\/[^\/\s]+\/verify-email\/[a-zA-Z0-9]+/g,
    ]

    for (const pattern of urlPatterns) {
      const match = body.match(pattern)
      if (match) {
        return match[0]
      }
    }

    return null
  }

  /**
   * Wait for an email to arrive for a specific address
   * Polls MailHog API until email is found or timeout is reached
   */
  async waitForEmail(
    email: string,
    options: { timeout?: number; interval?: number; subject?: string } = {}
  ): Promise<MailHogMessage> {
    const { timeout = 30000, interval = 1000, subject } = options
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const messages = await this.getMessagesForEmail(email)

      let targetMessage = messages[0] // Get latest message

      // Filter by subject if provided
      if (subject && targetMessage) {
        const messageSubject = targetMessage.Content.Headers['Subject']?.[0] || ''
        if (!messageSubject.includes(subject)) {
          targetMessage =
            messages.find((msg) => {
              const msgSubject = msg.Content.Headers['Subject']?.[0] || ''
              return msgSubject.includes(subject)
            }) || null
        }
      }

      if (targetMessage) {
        return targetMessage
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new Error(
      `Timeout waiting for email to ${email}${subject ? ` with subject "${subject}"` : ''}`
    )
  }

  /**
   * Clear all messages from MailHog
   */
  async clearMessages(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'DELETE',
      })
      // MailHog may return 404 if no messages exist, which is fine
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to clear MailHog messages: ${response.status}`)
      }
    } catch (error) {
      // If MailHog is not available or endpoint doesn't exist, just log and continue
      console.warn('Could not clear MailHog messages:', error)
    }
  }

  /**
   * Delete a specific message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete message ${messageId}: ${response.status}`)
    }
  }
}
