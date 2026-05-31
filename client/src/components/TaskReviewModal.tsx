import type { Task } from '../types/task'
import { getTaskStatusDisplay } from '../utils/taskStatusDisplay'

type TaskReviewModalProps = {
  task: Task
  comment: string
  onCommentChange: (value: string) => void
  onApprove: () => void
  onReject: () => void
  onClose: () => void
  isPending: boolean
}

function creatorEmail(task: Task): string {
  if (typeof task.userId === 'string') return task.userId
  return task.userId?.email ?? task.userId?._id ?? '—'
}

export function TaskReviewModal({
  task,
  comment,
  onCommentChange,
  onApprove,
  onReject,
  onClose,
  isPending,
}: TaskReviewModalProps) {
  const statusDisplay = getTaskStatusDisplay(task)

  return (
    <div
      className="tf-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="tf-modal-dialog tf-review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tf-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <section className="tasks-section tf-panel">
          <div className="tf-review-head">
            <div className="tf-review-head-left">
              <div className="tf-review-kicker">Review</div>
              <h2 id="tf-review-title" className="tf-review-title">
                {task.title}
              </h2>
            </div>
            <button
              type="button"
              className="tf-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="tf-review-section">
            <div className="tf-review-section-title">Description</div>
            <p className="tf-review-description">
              {task.description?.trim() ? task.description : 'No description provided.'}
            </p>
          </div>

          <div className="tf-review-divider" aria-hidden />

          <div className="tf-review-meta-row">
            <div className="tf-review-meta-item">
              <div className="tf-review-meta-label">User</div>
              <div className="tf-review-meta-value">{creatorEmail(task)}</div>
            </div>
            <div className="tf-review-meta-item tf-review-meta-right">
              {statusDisplay ? (
                <span className={statusDisplay.cls}>{statusDisplay.text}</span>
              ) : null}
            </div>
          </div>

          <div className="tf-review-divider" aria-hidden />

          <label className="tf-review-comment-label">
            <span className="tf-review-comment-title">Admin Feedback</span>
            <textarea
              className="tf-review-comment"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Write feedback for the user..."
              rows={6}
              disabled={isPending}
            />
          </label>

          <div className="tf-review-actions-row">
            <button
              type="button"
              className="tf-btn-ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <div className="tf-review-actions-group">
              <button
                type="button"
                className="tf-btn-danger"
                onClick={onReject}
                disabled={isPending}
              >
                {isPending ? 'Rejecting…' : 'Reject'}
              </button>
              <button
                type="button"
                className="tf-btn-success"
                onClick={onApprove}
                disabled={isPending}
              >
                {isPending ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
