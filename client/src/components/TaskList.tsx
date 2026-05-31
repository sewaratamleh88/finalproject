import type { Task } from '../types/task'
import { resolveTaskStatus } from '../utils/taskEdit'
import { TaskRow } from './TaskRow'

type TaskListProps = {
  tasks: Task[]
  isLoading: boolean
  isError: boolean
  deleteError: string | null
  showEmpty: boolean
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
  isAdmin?: boolean
  onOpenReview?: (task: Task) => void
  onRework?: (task: Task) => void
  onEdit?: (task: Task) => void
  toggleDisabled: boolean
  deleteDisabled: boolean
}

function partitionKanban(tasks: Task[]) {
  const todo = tasks.filter((t) => resolveTaskStatus(t) === 'todo')
  const done = tasks.filter((t) => {
    const s = resolveTaskStatus(t)
    return s === 'done' || s === 'approved' || s === 'rejected'
  })
  return { todo, done }
}

export function TaskList({
  tasks,
  isLoading,
  isError,
  deleteError,
  showEmpty,
  onToggle,
  onDelete,
  isAdmin,
  onOpenReview,
  onRework,
  onEdit,
  toggleDisabled,
  deleteDisabled,
}: TaskListProps) {
  const { todo, done } = partitionKanban(tasks)

  function renderColumn(
    title: string,
    dotClass: string,
    items: Task[],
    emptyHint: string,
  ) {
    return (
      <div className="tf-kanban-col">
        <div className="tf-col-header">
          <span className={`tf-col-dot ${dotClass}`} aria-hidden />
          <span className="tf-col-title">{title}</span>
          <span className="tf-col-count">{items.length}</span>
          <span className="tf-col-plus" aria-hidden>
            +
          </span>
        </div>
        <ul className="tasks-list tf-kanban-list">
          {items.map((t) => (
            <TaskRow
              key={t._id}
              task={t}
              isAdmin={!!isAdmin}
              onToggle={() => onToggle(t)}
              onDelete={() => onDelete(t)}
              onOpenReview={onOpenReview ? () => onOpenReview(t) : undefined}
              onRework={onRework ? () => onRework(t) : undefined}
              onEdit={onEdit ? () => onEdit(t) : undefined}
              toggleDisabled={toggleDisabled}
              deleteDisabled={deleteDisabled}
            />
          ))}
        </ul>
        {!isLoading && !isError && items.length === 0 ? (
          <p className="tf-col-empty">{emptyHint}</p>
        ) : null}
      </div>
    )
  }

  return (
    <section className="tasks-section tf-panel tf-kanban-panel">
      {isLoading ? <p className="tf-loading">Loading…</p> : null}
      {isError ? <p className="auth-error">Failed to load tasks.</p> : null}
      {deleteError ? <p className="auth-error">{deleteError}</p> : null}

      {showEmpty ? (
        <p className="tasks-empty">No tasks yet.</p>
      ) : (
        <>
          <div className="tf-kanban-board">
          {isAdmin ? (
            renderColumn('Review', 'tf-dot-done', done, 'No tasks to review.')
          ) : (
            <>
              {renderColumn(
                'To Do',
                'tf-dot-todo',
                todo,
                'Create a new task to get started.',
              )}
              {renderColumn('Completed', 'tf-dot-done', done, 'No completed tasks yet.')}
            </>
          )}
          </div>
        </>
      )}
    </section>
  )
}
