export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  invitation_code?: string
}

export interface RegisterResponse {
  user: {
    id: number
    name: string
    email: string
    has_password?: boolean
    email_verified_at?: string | null
  }
  email_verified: boolean
  email_sent: boolean
  requires_verification: boolean
  message: string
}

export interface LoginPayload {
  email: string
  password: string
  remember?: boolean
}

export interface LoginResponse {
  user: {
    id: number
    name: string
    email: string
    has_password?: boolean
    email_verified_at?: string | null
  }
  two_factor: boolean
}

export interface User {
  id: number
  name: string
  email: string
  has_password?: boolean
  email_verified_at?: string | null
}
