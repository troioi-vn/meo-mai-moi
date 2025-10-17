import React, { useCallback, useEffect, useState } from 'react'
import { api, csrf } from '@/api/axios'
import type { User } from '@/types/user'
import type { RegisterPayload, RegisterResponse, LoginPayload, LoginResponse } from '@/types/auth'
import { AuthContext } from './auth-context'

export { AuthContext }

interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: User | null
  initialLoading?: boolean
  skipInitialLoad?: boolean
}

export function AuthProvider({
  children,
  initialUser = null,
  initialLoading = true,
  skipInitialLoad = false,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState<boolean>(!skipInitialLoad && initialLoading)

  const loadUser = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: User }>('users/me')
      setUser(data.data)
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(
    async (payload: RegisterPayload): Promise<RegisterResponse> => {
      await csrf()
      const { data } = await api.post<{ data: RegisterResponse }>('/register', payload)
      
      // Don't automatically load user if verification is required
      // The user will be loaded after email verification
      if (data.data.email_verified) {
        await loadUser()
      }
      
      return data.data
    },
    [loadUser]
  )

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResponse> => {
      await csrf()
      const { data } = await api.post<{ data: LoginResponse }>('/login', payload)
      
      // Only load user if email is verified
      if (data.data.email_verified) {
        await loadUser()
      }
      
      return data.data
    },
    [loadUser]
  )

  const logout = useCallback(async () => {
    await api.post('/logout')
    setUser(null)
  }, [])

  const changePassword = useCallback(
    async (current_password: string, new_password: string, new_password_confirmation: string) => {
      await api.put('/users/me/password', {
        current_password,
        new_password,
        new_password_confirmation,
      })
    },
    []
  )

  const deleteAccount = useCallback(async (password: string) => {
    await api.delete('/users/me', { data: { password } })
    setUser(null)
    localStorage.removeItem('access_token')
  }, [])

  useEffect(() => {
    if (!skipInitialLoad) {
      void loadUser()
    }
  }, [loadUser, skipInitialLoad])

  const isAuthenticated = user !== null

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      register,
      login,
      logout,
      loadUser,
      changePassword,
      deleteAccount,
    }),
    [
      user,
      isLoading,
      isAuthenticated,
      register,
      login,
      logout,
      loadUser,
      changePassword,
      deleteAccount,
    ]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
