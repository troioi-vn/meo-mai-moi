import React, { useCallback, useEffect, useState } from 'react'
import { api, authApi, csrf } from '@/api/axios'
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

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResponse> => {
    await csrf()
    const { data } = await authApi.post<{ data: RegisterResponse }>('/register', payload)

    // Set user immediately (even if not yet verified) so header can show logout
    setUser(data.data.user)

    return data.data
  }, [])

  const login = useCallback(async (payload: LoginPayload): Promise<LoginResponse> => {
    await csrf()
    const { data } = await authApi.post<{ data: LoginResponse }>('/login', payload)

    // Set user immediately from response
    setUser(data.data.user)

    return data.data
  }, [])

  const logout = useCallback(async () => {
    await authApi.post('/logout')
    setUser(null)
  }, [])

  const checkEmail = useCallback(async (email: string): Promise<boolean> => {
    const { data } = await api.post<{ data: { exists: boolean } }>('/check-email', { email })
    return data.data.exists
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
      checkEmail,
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
      checkEmail,
    ]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
