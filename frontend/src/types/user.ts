export interface User {
  id: number
  name: string
  email: string
  avatar_url?: string
  has_password?: boolean
  email_verified_at?: string | null
}
