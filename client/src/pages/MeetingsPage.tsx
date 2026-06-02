import { TasksPageHeader } from '../components/TasksPageHeader'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMeeting, deleteMeeting, getMeetings, updateMeeting, type MeetingDto } from '../api/meetings'
import { fetchNotifications, markNotificationsRead } from '../api/notifications'
import { fetchUsers } from '../api/users'
import { MeetingEditModal } from '../components/MeetingEditModal'
import { MeetingCreateModal } from '../components/MeetingCreateModal'
import { MeetingsDayModal } from '../components/MeetingsDayModal'
import type { HistoryFilter } from '../utils/historyFilter'
import { matchesHistoryFilter } from '../utils/historyFilter'
import { io } from 'socket.io-client'

type NotificationItem = {
  id: string
  meetingId?: string
  message: string
  read: boolean
  createdAt: number
}

export function MeetingsPage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const baseYear = 2026
  const baseMonthIndex = 3 // April (0-based)
  const [monthOffset, setMonthOffset] = useState(() => {
    const raw = localStorage.getItem('tf:meetings:monthOffset')
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) ? parsed : 0
  })
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newMeetingDate, setNewMeetingDate] = useState('')
  const [newMeetingTitle, setNewMeetingTitle] = useState('')
  const [newMeetingTime, setNewMeetingTime] = useState('')

  const [editMeeting, setEditMeeting] = useState<MeetingDto | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [dayModalDate, setDayModalDate] = useState<string | null>(null)
  const [createServerError, setCreateServerError] = useState<string | null>(null)
  const [inviteAllUsers, setInviteAllUsers] = useState(false)
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [editServerError, setEditServerError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [toasts, setToasts] = useState<string[]>([])
  const [highlightMeetingIds, setHighlightMeetingIds] = useState<string[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const [, setNowTick] = useState(0)

  const MEETINGS_KEY = ['meetings'] as const

  function timeAgo(createdAt: number) {
    const diffMs = Date.now() - createdAt
    if (diffMs < 15_000) return 'just now'
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return `${diffSec}s ago`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    const diffD = Math.floor(diffH / 24)
    return `${diffD}d ago`
  }

  function scrollToMeetingById(meetingId: string) {
    const el = document.querySelector(`[data-meeting-id="${meetingId}"]`) as HTMLElement | null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    setHighlightMeetingIds((prev) => (prev.includes(meetingId) ? prev : [meetingId, ...prev]))
    window.setTimeout(() => {
      setHighlightMeetingIds((prev) => prev.filter((id) => id !== meetingId))
    }, 2600)
  }

  function showToast(message: string) {
    setToasts((prev) => [...prev, message])
    window.setTimeout(() => {
      setToasts((prev) => {
        const idx = prev.indexOf(message)
        if (idx < 0) return prev
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
      })
    }, 3600)
  }

  useEffect(() => {
    if (!user?.id) return
    let isAlive = true
    fetchNotifications()
      .then((items) => {
        if (!isAlive) return
        setNotifications((prev) => {
          const seen = new Set<string>()
          const merged: NotificationItem[] = []
          const push = (n: NotificationItem) => {
            const key = `${n.meetingId ?? ''}|${n.message}`
            if (seen.has(key)) return
            seen.add(key)
            merged.push(n)
          }

          // Prefer server notifications; then keep any local-only ones (e.g. realtime before fetch).
          for (const n of items) {
            push({
              id: n._id,
              meetingId: n.meetingId,
              message: n.message,
              read: n.read,
              createdAt: new Date(n.createdAt).getTime(),
            })
          }
          for (const n of prev) push(n)
          return merged.slice(0, 20)
        })
      })
      .catch(() => {})
    return () => {
      isAlive = false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('tf:notifications', JSON.stringify(notifications.slice(0, 20)))
    } catch {
      // ignore
    }
  }, [notifications])

  useEffect(() => {
    if (!isNotificationsOpen) return
    const t = window.setInterval(() => setNowTick((v) => v + 1), 30_000)
    return () => window.clearInterval(t)
  }, [isNotificationsOpen])

  const meetingsQuery = useQuery({
    queryKey: MEETINGS_KEY,
    queryFn: getMeetings,
  })

  const usersQuery = useQuery({
    queryKey: ['users'] as const,
    queryFn: fetchUsers,
    enabled: user?.role === 'admin',
  })

  const createMut = useMutation({
    mutationFn: (data: {
      title: string
      date: string
      time?: string
      participants?: string[]
      isAllUsers?: boolean
    }) => createMeeting(data),
    onSuccess: () => {
      setCreateServerError(null)
      void queryClient.invalidateQueries({ queryKey: MEETINGS_KEY })
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: unknown }).response === 'object' &&
        (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
      if (typeof msg === 'string') {
        setCreateServerError(msg === 'Cannot create a meeting in the past'
          ? 'The selected date has already passed'
          : msg)
      } else {
        setCreateServerError('Failed to create meeting.')
      }
    },
  })

  const updateMut = useMutation({
    mutationFn: (data: { id: string; title: string; date: string; time?: string }) =>
      updateMeeting(data.id, { title: data.title, date: data.date, time: data.time }),
    onSuccess: () => {
      setEditServerError(null)
      void queryClient.invalidateQueries({ queryKey: MEETINGS_KEY })
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: unknown }).response === 'object' &&
        (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
      if (typeof msg === 'string') {
        setEditServerError(msg)
      } else {
        setEditServerError('Failed to update meeting.')
      }
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMeeting(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEETINGS_KEY })
    },
  })

  function isPastDate(dateStr: string) {
    const selected = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(selected.getTime())) return false
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    return selected < todayStart
  }

  const { monthLabel, leadingEmptyCells, daysInMonth, year, monthIndex } =
    useMemo(() => {
    const base = new Date(baseYear, baseMonthIndex, 1)
    const view = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1)

    // JS: Sunday=0 ... Saturday=6. We want Sunday as the first column.
    const startDay = view.getDay()
    const daysCount = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()

    const label = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(view)

    return {
      monthLabel: label,
      leadingEmptyCells: startDay,
      daysInMonth: Array.from({ length: daysCount }, (_, i) => i + 1),
      year: view.getFullYear(),
      monthIndex: view.getMonth(),
    }
  }, [baseMonthIndex, baseYear, monthOffset])

  useEffect(() => {
    localStorage.setItem('tf:meetings:monthOffset', String(monthOffset))
  }, [monthOffset])

  useEffect(() => {
    if (!user?.id) return
    const socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:4000', {
      auth: { userId: user.id },
    })

    function onMeetingInvited(meeting: MeetingDto) {
      const meetingId = meeting?._id
      if (typeof meetingId !== 'string' || !meetingId) return

      let didInsert = false
      queryClient.setQueryData(MEETINGS_KEY, (prev) => {
        const list = Array.isArray(prev) ? prev : []
        if (list.some((m) => m._id === meetingId)) return list
        didInsert = true
        return [meeting, ...list]
      })
      if (didInsert) {
        showToast('You were invited to a meeting')
        setHighlightMeetingIds((prev) => (prev.includes(meetingId) ? prev : [meetingId, ...prev]))
        const createdAt = Date.now()
        setNotifications((prev) =>
          [
            {
              id: `${meetingId}:${createdAt}`,
              meetingId,
              message: 'You were invited to a meeting',
              read: false,
              createdAt,
            },
            ...prev,
          ].slice(0, 20),
        )
        window.setTimeout(() => {
          setHighlightMeetingIds((prev) => prev.filter((id) => id !== meetingId))
        }, 4200)
      }
    }

    socket.on('meeting_invited', onMeetingInvited)
    return () => {
      socket.off('meeting_invited', onMeetingInvited)
      socket.disconnect()
    }
  }, [MEETINGS_KEY, queryClient, user?.id])

  const unreadNotificationsCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [notifications],
  )

  useEffect(() => {
    if (!isNotificationsOpen) return
    const unreadIds = notifications
      .filter((n) => !n.read)
      .map((n) => n.id)
      .filter((id) => typeof id === 'string' && id.trim().length > 0)
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })))
    if (unreadIds.length > 0) {
      void markNotificationsRead(unreadIds)
    }
  }, [isNotificationsOpen, notifications])

  useEffect(() => {
    if (!isNotificationsOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isNotificationsOpen])

  function dateKey(day: number) {
    const mm = String(monthIndex + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  function setViewMonthForDate(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(d.getTime())) return
    const offset =
      (d.getFullYear() - baseYear) * 12 + (d.getMonth() - baseMonthIndex)
    setMonthOffset(offset)
  }

  function openAddMeeting() {
    setNewMeetingDate('')
    setNewMeetingTitle('')
    setNewMeetingTime('')
    setInviteAllUsers(false)
    setParticipantIds([])
    setCreateServerError(null)
    setIsAddOpen(true)
  }

  function handleInviteAllUsersChange(checked: boolean) {
    setInviteAllUsers(checked)
    if (checked) setParticipantIds([])
  }

  function openDayMeetings(dateStr: string) {
    setDayModalDate(dateStr)
  }

  function closeDayMeetings() {
    setDayModalDate(null)
  }

  function openEditMeeting(m: MeetingDto) {
    setEditServerError(null)
    setEditMeeting(m)
    setEditTitle(m.title ?? '')
    setEditDate(m.date ?? '')
    setEditTime(m.time ?? '')
  }

  function closeEditMeeting() {
    if (updateMut.isPending) return
    setEditMeeting(null)
    setEditTitle('')
    setEditDate('')
    setEditTime('')
    setEditServerError(null)
  }

  function handleEditSave() {
    if (!editMeeting) return
    updateMut.mutate(
      {
        id: editMeeting._id,
        title: editTitle.trim(),
        date: editDate,
        time: editTime || undefined,
      },
      {
        onSuccess: () => {
          closeEditMeeting()
        },
      },
    )
  }

  function handleDeleteMeeting(m: MeetingDto) {
    deleteMut.mutate(m._id)
  }

  function handleAddSubmit() {
    const date = newMeetingDate
    const title = newMeetingTitle.trim()
    if (!date || !title) return

    const payload: {
      title: string
      date: string
      time?: string
      participants?: string[]
      isAllUsers?: boolean
    } = { title, date, time: newMeetingTime || undefined }

    if (user?.role === 'admin') {
      payload.isAllUsers = inviteAllUsers
      if (!inviteAllUsers && participantIds.length > 0) {
        payload.participants = participantIds
      }
    }

    createMut.mutate(payload, {
      onSuccess: () => {
        setNewMeetingDate('')
        setNewMeetingTitle('')
        setNewMeetingTime('')
        setInviteAllUsers(false)
        setParticipantIds([])
        if (date) setViewMonthForDate(date)
        setIsAddOpen(false)
      },
    })
  }

  const meetings = meetingsQuery.data ?? []
  const activeMeetings = meetings.filter((m) => !isPastDate(m.date))
  const pastMeetings = meetings
    .filter((m) => isPastDate(m.date))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (a.time ?? '').localeCompare(b.time ?? ''),
    )
  const filteredPastMeetings = pastMeetings.filter((m) =>
    matchesHistoryFilter(m.date, historyFilter),
  )

  function formatMeetingDate(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }

  return (
    <div className="tasks-page tf-tasks">
      <div className="tf-page-head tf-meetings-head">
        <TasksPageHeader user={user} onLogout={logout} />
        <div ref={notificationsRef} className="tf-notifications">
          <button
            type="button"
            className="tf-notifications-btn"
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
            onClick={() => setIsNotificationsOpen((v) => !v)}
          >
            <span className="tf-notifications-icon" aria-hidden>
              🔔
            </span>
            {unreadNotificationsCount > 0 ? (
              <span className="tf-notifications-badge" aria-label={`${unreadNotificationsCount} unread`}>
                {unreadNotificationsCount}
              </span>
            ) : null}
          </button>
          {isNotificationsOpen ? (
            <div className="tf-notifications-dropdown" role="menu" aria-label="Notification center">
              <div className="tf-notifications-head">
                <div className="tf-notifications-title">Notifications</div>
                <button
                  type="button"
                  className="tf-notifications-clear"
                  onClick={() => setNotifications([])}
                >
                  Clear all
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="tf-notifications-empty">No notifications</div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`tf-notification-item${n.read ? '' : ' tf-notification-item-unread'}`}
                    role="menuitem"
                    onClick={() => {
                      setIsNotificationsOpen(false)
                      if (n.meetingId) scrollToMeetingById(n.meetingId)
                    }}
                  >
                    <div className="tf-notification-message">{n.message}</div>
                    <div className="tf-notification-time" aria-label="Notification time">
                      {timeAgo(n.createdAt)}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
      {toasts.length > 0 ? (
        <div className="tf-toast-stack tf-toast-topright" aria-live="polite">
          {toasts.map((t, idx) => (
            <div key={`${idx}-${t}`} className="tf-toast" role="status">
              {t}
            </div>
          ))}
        </div>
      ) : null}

      <div className="tf-board-toolbar">
        <div className="tf-board-titles">
          <h1 className="tf-board-title">Meetings</h1>
          <p className="tf-board-sub">Monthly calendar view (demo).</p>
        </div>
        <button type="button" className="tf-btn-hero" onClick={openAddMeeting}>
          New Meeting
        </button>
      </div>

      <section className="tasks-section tf-panel tf-calendar-panel">
        <div className="tf-calendar-header">
          <button
            type="button"
            className="tf-cal-nav"
            onClick={() => setMonthOffset((v) => v - 1)}
            aria-label="Previous month"
          >
            ←
          </button>
          <div className="tf-cal-month" aria-label="Current month">
            {monthLabel}
          </div>
          <button
            type="button"
            className="tf-cal-nav"
            onClick={() => setMonthOffset((v) => v + 1)}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="tf-calendar-grid" aria-label="Monthly calendar">
          {weekDays.map((d) => (
            <div key={d} className="tf-calendar-weekday" aria-hidden>
              {d}
            </div>
          ))}

          {Array.from({ length: leadingEmptyCells }, (_, i) => (
            <div key={`empty-${i}`} className="tf-calendar-cell tf-calendar-cell-empty" />
          ))}

          {daysInMonth.map((day) => (
            <div
              key={day}
              className="tf-calendar-cell"
              aria-label={`Day ${day}`}
              role="button"
              tabIndex={0}
              onClick={() => openDayMeetings(dateKey(day))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openDayMeetings(dateKey(day))
                }
              }}
            >
              <div className="tf-calendar-day">{day}</div>
              <div className="tf-calendar-meetings">
                {activeMeetings
                  .filter((m) => m.date === dateKey(day))
                  .map((m) => (
                    <button
                      key={m._id}
                      type="button"
                      className={`tf-cal-badge tf-cal-badge-btn${highlightMeetingIds.includes(m._id) ? ' tf-cal-badge-highlight' : ''}`}
                      data-meeting-id={m._id}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditMeeting(m)
                      }}
                      aria-label={`Edit meeting: ${m.title}`}
                    >
                      {m.title?.trim() ? m.title : m.time || 'Untitled'}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="tf-history-toggle-row">
        <button
          type="button"
          className="tf-btn-ghost tf-history-toggle"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {showHistory ? (
      <section
        className="tasks-section tf-panel tf-history-panel"
        aria-labelledby="tf-past-meetings-title"
      >
        <div className="tf-history-head">
          <h2 id="tf-past-meetings-title" className="tf-history-title">
            Past Meetings
          </h2>
          <p className="tf-history-sub">
            {filteredPastMeetings.length} past meeting
            {filteredPastMeetings.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="tf-history-filter" role="group" aria-label="Filter history by time">
          <button
            type="button"
            className={`tf-history-filter-btn${historyFilter === 'month' ? ' tf-history-filter-btn-active' : ''}`}
            onClick={() => setHistoryFilter('month')}
          >
            Last Month
          </button>
          <button
            type="button"
            className={`tf-history-filter-btn${historyFilter === '3months' ? ' tf-history-filter-btn-active' : ''}`}
            onClick={() => setHistoryFilter('3months')}
          >
            Last 3 Months
          </button>
          <button
            type="button"
            className={`tf-history-filter-btn${historyFilter === 'all' ? ' tf-history-filter-btn-active' : ''}`}
            onClick={() => setHistoryFilter('all')}
          >
            All
          </button>
        </div>
        {meetingsQuery.isLoading ? (
          <p className="tf-loading">Loading…</p>
        ) : meetingsQuery.isError ? (
          <p className="auth-error">Failed to load meetings.</p>
        ) : filteredPastMeetings.length === 0 ? (
          <p className="tf-col-empty">No past meetings in this period.</p>
        ) : (
          <ul className="tf-history-list">
            {filteredPastMeetings.map((m) => (
              <li key={m._id}>
                <button
                  type="button"
                  className={`tf-history-item tf-history-item-btn${highlightMeetingIds.includes(m._id) ? ' tf-history-item-highlight' : ''}`}
                  data-meeting-id={m._id}
                  onClick={() => openEditMeeting(m)}
                  aria-label={`View meeting: ${m.title}`}
                >
                  <span className="tf-history-item-title">
                    {m.title?.trim() ? m.title : 'Untitled'}
                  </span>
                  <span className="tf-history-item-meta">
                    {formatMeetingDate(m.date)}
                    {m.time?.trim() ? ` · ${m.time}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}

      {dayModalDate ? (
        <MeetingsDayModal
          date={dayModalDate}
          meetings={meetings.filter((m) => m.date === dayModalDate)}
          onSelectMeeting={(m) => {
            closeDayMeetings()
            openEditMeeting(m)
          }}
          onDeleteMeeting={handleDeleteMeeting}
          isDeleting={deleteMut.isPending}
          onClose={closeDayMeetings}
        />
      ) : null}

      {editMeeting ? (
        <MeetingEditModal
          meeting={editMeeting}
          title={editTitle}
          date={editDate}
          time={editTime}
          onTitleChange={setEditTitle}
          onDateChange={setEditDate}
          onTimeChange={setEditTime}
          onSave={handleEditSave}
          onClose={closeEditMeeting}
          isPending={updateMut.isPending}
          serverError={editServerError}
          lockedMessage={isPastDate(editMeeting.date) ? 'Cannot edit past meetings' : null}
        />
      ) : null}

      {isAddOpen ? (
        <MeetingCreateModal
          title={newMeetingTitle}
          date={newMeetingDate}
          time={newMeetingTime}
          onTitleChange={setNewMeetingTitle}
          onDateChange={setNewMeetingDate}
          onTimeChange={setNewMeetingTime}
          onCreate={handleAddSubmit}
          onClose={() => setIsAddOpen(false)}
          isPending={createMut.isPending}
          serverError={createServerError}
          isAdmin={user?.role === 'admin'}
          inviteAllUsers={inviteAllUsers}
          onInviteAllUsersChange={handleInviteAllUsersChange}
          participantIds={participantIds}
          onParticipantIdsChange={setParticipantIds}
          inviteUsers={usersQuery.data ?? []}
        />
      ) : null}
    </div>
  )
}

