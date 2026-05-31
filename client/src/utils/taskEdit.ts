import type { Task, TaskStatus } from '../types/task'

export function resolveTaskStatus(task: Task): TaskStatus {
  if (task.status) return task.status
  return task.completed ? 'done' : 'todo'
}

export function canEditTask(task: Task): boolean {
  const status = resolveTaskStatus(task)
  return status === 'todo' || status === 'rejected'
}
