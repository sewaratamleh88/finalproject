import { http } from './http'

export type UserListItem = {
  _id: string
  email: string
  role: 'user' | 'admin'
}

export async function fetchUsers(): Promise<UserListItem[]> {
  const res = await http.get<UserListItem[]>('/api/users')
  return res.data
}
