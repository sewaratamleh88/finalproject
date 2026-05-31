import type { Task } from '../types/task'

export type TaskStatusDisplay = {
  text: string
  cls: string
}

export function getTaskStatusDisplay(task: Task): TaskStatusDisplay | null {
  const status = task.status ?? (task.completed ? 'done' : 'todo')

  if (status === 'done') {
    return { text: 'Waiting for Approval', cls: 'tf-status tf-status-waiting' }
  }
  if (status === 'approved') {
    return { text: 'Approved', cls: 'tf-status tf-status-approved' }
  }
  if (status === 'rejected') {
    return { text: 'Rejected', cls: 'tf-status tf-status-rejected' }
  }

  return null
}
