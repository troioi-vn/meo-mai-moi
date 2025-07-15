import React, { useCallback, useEffect, useState } from 'react'
import { api, csrf } from '@/api/axios'

interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

interface LoginPayload {
  email: string
  password: string
}

import type { User } from '@/types/user'
import { AuthContext } from './auth-context'

export { AuthContext }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`
      }
      const { data } = await api.get<User>('/user')
      setUser(data)
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await csrf()
      await api.post('/register', payload)
      await loadUser()
    },
    [loadUser]
  )

  const login = useCallback(
    async (payload: LoginPayload) => {
      await csrf()
      const response = await api.post<{ access_token: string }>('/login', payload)
      localStorage.setItem('access_token', response.data.access_token)
      await loadUser()
    },
    [loadUser]
  )

  const logout = useCallback(async () => {
    localStorage.removeItem('access_token')
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
  }, [])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

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
