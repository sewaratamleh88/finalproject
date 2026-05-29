import type { Task } from '../types/task'

type TaskRowProps = {
  task: Task
  onToggle: () => void
  onDelete: () => void
  isAdmin?: boolean
  onOpenReview?: () => void
  onRework?: () => void
  toggleDisabled: boolean
  deleteDisabled: boolean
}

function priorityLabel(priority: Task['priority']): string {
  if (priority === 'high') return 'High'
  if (priority === 'low') return 'Low'
  return 'Medium'
}

function reviewStatusLabel(task: Task) {
  if (task.status === 'done' || (!task.status && task.completed))
    return { text: 'Done', cls: 'tf-status tf-status-done' }
  if (task.status === 'approved') return { text: 'Approved', cls: 'tf-status tf-status-approved' }
  if (task.status === 'rejected') return { text: 'Rejected', cls: 'tf-status tf-status-rejected' }
  return null
}

export function TaskRow({
  task,
  onToggle,
  onDelete,
  isAdmin,
  onOpenReview,
  onRework,
  toggleDisabled,
  deleteDisabled,
}: TaskRowProps) {
  const effectiveStatus = task.status ?? (task.completed ? 'done' : 'todo')
  const badgeClass =
    task.priority === 'high'
      ? 'tf-badge tf-badge-urgent'
      : task.priority === 'low'
        ? 'tf-badge tf-badge-low'
        : 'tf-badge tf-badge-medium'
  const reviewStatus = reviewStatusLabel(task)
  const isReviewed = task.status === 'approved' || task.status === 'rejected'
  const canDelete = !isAdmin && task.status === 'approved'
  const canRework = !isAdmin && task.status === 'rejected'

  const cardInner = (
    <>
      <div className="tf-task-card-head">
        <div className="tf-task-badges">
          {!isAdmin && effectiveStatus === 'todo' ? (
            <span className={badgeClass}>{priorityLabel(task.priority)}</span>
          ) : null}
          {!isAdmin && reviewStatus ? (
            <span className={reviewStatus.cls}>{reviewStatus.text}</span>
          ) : null}
        </div>
        {!isAdmin ? (
          canDelete ? (
            <button
              type="button"
              className="task-delete"
              disabled={deleteDisabled}
              onClick={onDelete}
            >
              Delete
            </button>
          ) : null
        ) : (
          <span className="tf-review-open-hint">Click to review</span>
        )}
      </div>
      <div className="task-main tf-task-main">
        {!isAdmin ? (
          <label className="tf-task-check-label">
            <input
              type="checkbox"
              checked={task.completed}
              disabled={toggleDisabled || isReviewed}
              onChange={onToggle}
            />
          </label>
        ) : null}
        <span className="tf-task-title">{task.title}</span>
      </div>
      {!isAdmin && task.description?.trim() ? (
        <p className="tf-task-desc">{task.description}</p>
      ) : null}
      {isAdmin ? (
        <div className="tf-review-meta">
          <span className="tf-review-meta-label">Created by:</span>
          <span className="tf-review-meta-value">
            {typeof task.userId === 'string'
              ? task.userId
              : task.userId?.email ?? task.userId?._id ?? '—'}
          </span>
        </div>
      ) : null}
      {!isAdmin && isReviewed && task.comment?.trim() ? (
        <p className="tf-user-comment">
          <span className="tf-user-comment-label">Admin comment:</span> {task.comment}
        </p>
      ) : null}
      {!isAdmin && canRework ? (
        <button
          type="button"
          className="tf-rework-btn"
          disabled={deleteDisabled}
          onClick={onRework}
        >
          Back to work
        </button>
      ) : null}
    </>
  )

  return (
    <li
      className={`task-row tf-task-row tf-kanban-card tf-priority-${task.priority}${isAdmin ? ' tf-task-row-reviewable' : ''}`}
    >
      <span className="tf-task-accent" aria-hidden />
      {isAdmin ? (
        <button
          type="button"
          className="tf-task-card-btn"
          onClick={onOpenReview}
          disabled={deleteDisabled}
          aria-label={`Review task: ${task.title}`}
        >
          <div className="tf-task-card-inner">{cardInner}</div>
        </button>
      ) : (
        <div className="tf-task-card-inner">{cardInner}</div>
      )}
    </li>
  )
}
