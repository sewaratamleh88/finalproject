import type { FormEvent } from 'react'
import type { TaskPriority, TaskStatus } from '../types/task'

type TaskFormProps = {
  title: string
  description: string
  priority: TaskPriority | ''
  status: TaskStatus
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onPriorityChange: (value: TaskPriority | '') => void
  priorityError?: string | null
  onStatusChange: (value: TaskStatus) => void
  onSubmit: (e: FormEvent) => void
  isPending: boolean
  showCreateError: boolean
  onCancel?: () => void
  formTitle?: string
  submitLabel?: string
  showStatusSelect?: boolean
}

export function TaskForm({
  title,
  description,
  priority,
  status,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onStatusChange,
  onSubmit,
  isPending,
  showCreateError,
  priorityError,
  onCancel,
  formTitle = 'New Task',
  submitLabel,
  showStatusSelect = true,
}: TaskFormProps) {
  const resolvedSubmitLabel =
    submitLabel ?? (isPending ? 'Saving…' : formTitle === 'Edit Task' ? 'Save' : 'Add')

  return (
    <section id="tf-new-task" className="tasks-section tf-panel tf-new-task-panel">
      <div className="tf-new-task-head">
        <h2 id="tf-new-task-title" className="tasks-h2">
          {formTitle}
        </h2>
        {onCancel ? (
          <button
            type="button"
            className="tf-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        ) : null}
      </div>
      <form onSubmit={onSubmit} className="tasks-form">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
        />
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as TaskPriority | '')}
          aria-label="Priority"
          required
        >
          <option value="" disabled>
            Select Priority
          </option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {priorityError ? <p className="auth-error">{priorityError}</p> : null}
        {showStatusSelect ? (
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            aria-label="Task status"
          >
            <option value="todo">To Do</option>
            <option value="done">Done</option>
          </select>
        ) : null}
        <div className="tasks-form-actions">
          {onCancel ? (
            <button
              type="button"
              className="tasks-form-cancel"
              disabled={isPending}
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            className="tasks-form-submit"
            disabled={isPending}
          >
            {resolvedSubmitLabel}
          </button>
        </div>
      </form>
      {showCreateError ? (
        <p className="auth-error">Failed to save task.</p>
      ) : null}
    </section>
  )
}
