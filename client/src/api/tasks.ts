import type { Task, TaskInput } from '../types/task'
import { http } from './http'

export async function fetchTasks(params?: { userId?: string }): Promise<Task[]> {
  const res = await http.get<Task[]>('/api/tasks', { params })
  return res.data
}

export async function createTask(input: TaskInput): Promise<Task> {
  const res = await http.post<Task>('/api/tasks', input)
  return res.data
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const res = await http.put<Task>(`/api/tasks/${id}`, input)
  return res.data
}

export async function deleteTask(id: string): Promise<void> {
  await http.delete(`/api/tasks/${id}`)
}
