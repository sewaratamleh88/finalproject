import type { AuthResponse, LoginCredentials, RegisterCredentials } from '../types/auth'
import { http } from './http'

export async function register(data: RegisterCredentials): Promise<AuthResponse> {
  const res = await http.post<AuthResponse>('/api/auth/register', data)
  return res.data
}

export async function login(data: LoginCredentials): Promise<AuthResponse> {
  const res = await http.post<AuthResponse>('/api/auth/login', data)
  return res.data
}
