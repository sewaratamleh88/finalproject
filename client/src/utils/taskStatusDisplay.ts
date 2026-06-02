import type { Task } from '../types/task'
import { resolveTaskStatus } from './taskEdit'

export type TaskStatusDisplay = {
  cls: string
  text: string
}

export function getTaskStatusDisplay(task: Task): TaskStatusDisplay | null {
  const status = resolveTaskStatus(task)
  switch (status) {
    case 'done':
      return { cls: 'tf-status tf-status-waiting', text: 'Waiting for review' }
    case 'approved':
      return { cls: 'tf-status tf-status-approved', text: 'Approved' }
    case 'rejected':
      return { cls: 'tf-status tf-status-rejected', text: 'Rejected' }
    default:
      return null
  }
}
