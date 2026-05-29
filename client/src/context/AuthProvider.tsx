import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../types/auth'
import {
  clearAuth,
  getStoredUser,
  getToken,
  setAuth as persistAuth,
} from '../lib/authStorage'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken())
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  const setSession = useCallback((newToken: string, newUser: User) => {
    persistAuth(newToken, newUser)
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      setSession,
      logout,
    }),
    [user, token, setSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
