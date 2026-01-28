import type { User } from './user'

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  invitation_code?: string
}

export interface RegisterResponse {
  user: User
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
  user: User
  two_factor: boolean
}
