import type { Task, TaskStatus } from '../types/task'

const TASK_STATUSES: readonly TaskStatus[] = [
  'todo',
  'in_progress',
  'done',
  'approved',
  'rejected',
]

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)
}

export function resolveTaskStatus(task: Task): TaskStatus {
  if (isTaskStatus(task.status)) {
    if (task.status === 'in_progress') return 'todo'
    return task.status
  }
  return task.completed ? 'done' : 'todo'
}

export function canEditTask(task: Task): boolean {
  return resolveTaskStatus(task) === 'todo'
}
