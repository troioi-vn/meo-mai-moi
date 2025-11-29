import type { User } from '@/types/user'

export const mockUser: User = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  email_verified_at: new Date().toISOString(),
}
