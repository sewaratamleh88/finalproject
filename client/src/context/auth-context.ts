import { createContext } from 'react'
import type { User } from '../types/auth'

export type AuthContextValue = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setSession: (token: string, user: User) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
