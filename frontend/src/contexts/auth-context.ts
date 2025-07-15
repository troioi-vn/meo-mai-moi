import type { User } from '@/types/user'
import type { RegisterPayload, LoginPayload } from '@/types/auth'
import { createContext } from 'react'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  register: (payload: RegisterPayload) => Promise<void>
  login: (payload: LoginPayload) => Promise<void>
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
