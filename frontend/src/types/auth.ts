export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  invitation_code?: string
}

export interface RegisterResponse {
  access_token: string
  token_type: string
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
  access_token: string
  token_type: string
  email_verified: boolean
}

export interface User {
  id: number
  name: string
  email: string
  email_verified_at?: string | null
}
