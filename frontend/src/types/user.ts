import type { SupportedLocale } from '@/i18n'

export interface User {
  id: number
  name: string
  email: string
  avatar_url?: string
  has_password?: boolean
  email_verified_at?: string | null
  is_banned?: boolean
  banned_at?: string | null
  ban_reason?: string | null
  can_access_admin?: boolean
  roles?: string[]
  locale?: SupportedLocale
}
