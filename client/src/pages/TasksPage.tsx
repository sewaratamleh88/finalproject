import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useEffect, useState } from 'react'
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
} from '../api/tasks'
import { TaskForm } from '../components/TaskForm'
import { TaskList } from '../components/TaskList'
import { TaskReviewModal } from '../components/TaskReviewModal'
import { TasksPageHeader } from '../components/TasksPageHeader'
import { useAuth } from '../hooks/useAuth'
import type { Task, TaskPriority, TaskStatus } from '../types/task'

const TASKS_KEY = ['tasks'] as const

export function TasksPage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>(
    'all',
  )
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [reviewTask, setReviewTask] = useState<Task | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [allUsers, setAllUsers] = useState<Array<{ id: string; label: string }>>(
    [],
  )

  const tasksQuery = useQuery<Task[]>({
    queryKey: [...TASKS_KEY, { userId: user?.role === 'admin' ? selectedUserId : 'me' }] as const,
    queryFn: () =>
      fetchTasks(
        user?.role === 'admin' && selectedUserId !== 'all'
          ? { userId: selectedUserId }
          : undefined,
      ),
  })

  const createMut = useMutation({
    mutationFn: () =>
      createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status: taskStatus,
      }),
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setTaskStatus('todo')
      setIsNewTaskOpen(false)
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY })
    },
  })

  const toggleMut = useMutation({
    mutationFn: ({
      id,
      completed,
      status,
    }: {
      id: string
      completed: boolean
      status: TaskStatus
    }) => updateTask(id, { completed, status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  })

  const reviewMut = useMutation({
    mutationFn: ({
      id,
      status,
      comment,
    }: {
      id: string
      status: 'approved' | 'rejected'
      comment: string
    }) => updateTask(id, { status, comment: comment.trim() || undefined }),
    onMutate: async ({ id, status, comment }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY })
      const prev = queryClient.getQueryData<Task[]>(TASKS_KEY)

      queryClient.setQueryData<Task[]>(TASKS_KEY, (current) => {
        if (!current) return current
        if (user?.role !== 'admin') return current
        return current.filter((t) => t._id !== id)
      })

      return { prev, id, status, comment }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(TASKS_KEY, ctx.prev)
    },
    onSuccess: () => {
      setReviewTask(null)
      setReviewComment('')
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY })
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  })

  const reworkMut = useMutation({
    mutationFn: ({ id }: { id: string }) => updateTask(id, { status: 'todo' }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY })
      const prev = queryClient.getQueryData<Task[]>(TASKS_KEY)
      queryClient.setQueryData<Task[]>(TASKS_KEY, (current) => {
        if (!current) return current
        return current.map((t) => (t._id === id ? { ...t, status: 'todo', completed: false } : t))
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(TASKS_KEY, ctx.prev)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      setDeleteError(null)
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY })
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setDeleteError('Not allowed to delete this task.')
      } else {
        setDeleteError('Delete failed.')
      }
    },
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    createMut.mutate()
  }

  const tasks = tasksQuery.data ?? []
  const adminUsers = user?.role === 'admin' ? allUsers : []

  useEffect(() => {
    if (user?.role !== 'admin') return
    if (selectedUserId !== 'all') return
    if (tasksQuery.isLoading || tasksQuery.isError) return
    const data = tasksQuery.data
    if (!data) return

    const next = Array.from(
      new Map(
        data
          .map((t) => {
            const u = t.userId
            if (typeof u === 'string') return { id: u, label: u }
            if (u && u._id) return { id: u._id, label: u.email ?? u._id }
            return null
          })
          .filter(Boolean)
          .map((u) => [
            (u as { id: string; label: string }).id,
            u as { id: string; label: string },
          ]),
      ).values(),
    )

    // Avoid synchronous setState inside effect (eslint rule).
    const t = setTimeout(() => setAllUsers(next), 0)
    return () => clearTimeout(t)
  }, [selectedUserId, tasksQuery.data, tasksQuery.isError, tasksQuery.isLoading, user?.role])
  const normalizedSearch = search.trim().toLowerCase()
  const searchFilteredTasks =
    normalizedSearch.length === 0
      ? tasks
      : tasks.filter((t) => {
          const hay = `${t.title} ${t.description ?? ''}`.toLowerCase()
          return hay.includes(normalizedSearch)
        })
  const filteredTasks =
    priorityFilter === 'all'
      ? searchFilteredTasks
      : searchFilteredTasks.filter((t) => t.priority === priorityFilter)
  const showEmpty =
    !tasksQuery.isLoading &&
    !tasksQuery.isError &&
    filteredTasks.length === 0

  function handleToggle(task: Task) {
    const nextCompleted = !task.completed
    const nextStatus: TaskStatus = nextCompleted ? 'done' : 'todo'
    toggleMut.mutate({
      id: task._id,
      completed: nextCompleted,
      status: nextStatus,
    })
  }

  function handleDelete(task: Task) {
    setDeleteError(null)
    deleteMut.mutate(task._id)
  }

  function handleRework(task: Task) {
    reworkMut.mutate({ id: task._id })
  }

  function openReview(task: Task) {
    setReviewTask(task)
    setReviewComment('')
  }

  function closeReview() {
    if (reviewMut.isPending) return
    setReviewTask(null)
    setReviewComment('')
  }

  function submitReview(status: 'approved' | 'rejected') {
    if (!reviewTask) return
    reviewMut.mutate({
      id: reviewTask._id,
      status,
      comment: reviewComment,
    })
  }

  useEffect(() => {
    if (!isNewTaskOpen && !reviewTask) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (reviewTask) {
        if (!reviewMut.isPending) {
          setReviewTask(null)
          setReviewComment('')
        }
      } else {
        setIsNewTaskOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isNewTaskOpen, reviewTask, reviewMut.isPending])

  const totalCount = tasks.length
  const visibleCount = filteredTasks.length

  return (
    <div className="tasks-page tf-tasks">
      <TasksPageHeader user={user} onLogout={logout} />

      <div className="tf-board-toolbar">
        <div className="tf-board-titles">
          <h1 className="tf-board-title">
            {user?.role === 'admin' ? 'Task Review' : 'Tasks'}
          </h1>
          <p className="tf-board-sub">
            {user?.role === 'admin'
              ? `Review screen — showing ${visibleCount} of ${totalCount} completed tasks`
              : `Showing ${visibleCount} of ${totalCount} tasks`}
          </p>
        </div>
        {user?.role !== 'admin' ? (
          <button
            type="button"
            className="tf-btn-hero"
            onClick={() => setIsNewTaskOpen(true)}
          >
            + New Task
          </button>
        ) : null}
      </div>

      <div className="tf-filter-bar">
        <div className="tf-filter-search">
          <span className="tf-search-icon" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
          />
        </div>
        {user?.role !== 'admin' ? (
          <select
            className="tf-filter-select"
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as TaskPriority | 'all')
            }
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        ) : null}
        {user?.role === 'admin' ? (
          <select
            className="tf-filter-select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            aria-label="Filter by user"
          >
            <option value="all">All users</option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {user?.role !== 'admin' && isNewTaskOpen ? (
        <div
          className="tf-modal-backdrop"
          role="presentation"
          onClick={() => setIsNewTaskOpen(false)}
        >
          <div
            className="tf-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tf-new-task-title"
            onClick={(e) => e.stopPropagation()}
          >
            <TaskForm
              title={title}
              description={description}
              priority={priority}
              status={taskStatus}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onPriorityChange={setPriority}
              onStatusChange={setTaskStatus}
              onSubmit={handleAdd}
              isPending={createMut.isPending}
              showCreateError={createMut.isError}
              onCancel={() => setIsNewTaskOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {reviewTask ? (
        <TaskReviewModal
          task={reviewTask}
          comment={reviewComment}
          onCommentChange={setReviewComment}
          onApprove={() => submitReview('approved')}
          onReject={() => submitReview('rejected')}
          onClose={closeReview}
          isPending={reviewMut.isPending}
        />
      ) : null}

      <TaskList
        tasks={filteredTasks}
        isLoading={tasksQuery.isLoading}
        isError={tasksQuery.isError}
        deleteError={deleteError}
        showEmpty={showEmpty}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onOpenReview={user?.role === 'admin' ? openReview : undefined}
        onRework={user?.role !== 'admin' ? handleRework : undefined}
        isAdmin={user?.role === 'admin'}
        toggleDisabled={toggleMut.isPending}
        deleteDisabled={deleteMut.isPending || reviewMut.isPending || reworkMut.isPending}
      />
    </div>
  )
}
