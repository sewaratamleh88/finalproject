export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'approved'
  | 'rejected'

export type TaskCreator =
  | string
  | {
      _id: string
      email?: string
      role?: 'user' | 'admin'
    }

export interface Task {
  _id: string
  title: string
  description?: string
  priority: TaskPriority
  status?: TaskStatus
  userId?: TaskCreator
  comment?: string
  completed: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  completed?: boolean
  status?: TaskStatus
  comment?: string
}
