export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
export interface User {
  id: number
  name: string
  email: string
}

export interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  isLoading: boolean
  register: (payload: RegisterPayload) => Promise<void>
  changePassword: (
    current_password: string,
    new_password: string,
    new_password_confirmation: string
  ) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}
