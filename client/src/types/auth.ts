export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
}
