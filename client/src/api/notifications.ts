import { http } from './http'

export type NotificationDto = {
  _id: string
  userId: string
  type: 'meeting_invite'
  message: string
  meetingId?: string
  read: boolean
  createdAt: string
  updatedAt: string
}

export async function fetchNotifications(): Promise<NotificationDto[]> {
  const res = await http.get<NotificationDto[]>('/api/notifications')
  return res.data
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  await http.patch('/api/notifications/mark-read', ids?.length ? { ids } : {})
}

