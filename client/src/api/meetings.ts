import { http } from './http'

export type MeetingDto = {
  _id: string
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM (optional)
  createdBy: string
  createdAt: string
  updatedAt: string
}

export async function getMeetings(): Promise<MeetingDto[]> {
  const res = await http.get<MeetingDto[]>('/api/meetings')
  return res.data
}

export async function createMeeting(data: {
  title: string
  date: string
  time?: string
}): Promise<MeetingDto> {
  const res = await http.post<MeetingDto>('/api/meetings', data)
  return res.data
}

export async function updateMeeting(
  id: string,
  data: { title: string; date: string; time?: string },
): Promise<MeetingDto> {
  const res = await http.put<MeetingDto>(`/api/meetings/${id}`, data)
  return res.data
}

