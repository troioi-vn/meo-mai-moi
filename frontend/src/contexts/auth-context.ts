import type { User } from '@/types/user'
import type { RegisterPayload, RegisterResponse, LoginPayload, LoginResponse } from '@/types/auth'
import { createContext } from 'react'

// Auth is intentionally status-driven: `user === null` can mean "not checked yet",
// "recovering a known session", or "confirmed guest".
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous' | 'recovering'

export const authIsSettled = (status: AuthStatus): boolean =>
  status === 'authenticated' || status === 'anonymous'

export const authStatusIsLoading = (status: AuthStatus): boolean =>
  status === 'unknown' || status === 'recovering'

export interface AuthContextType {
  user: User | null
  status: AuthStatus
  isLoading: boolean
  isAuthenticated: boolean
  isRecovering: boolean
  register: (payload: RegisterPayload) => Promise<RegisterResponse>
  login: (payload: LoginPayload) => Promise<LoginResponse>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  changePassword: (
    current_password: string,
    new_password: string,
    new_password_confirmation: string
  ) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
