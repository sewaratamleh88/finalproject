import { TasksPageHeader } from '../components/TasksPageHeader'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMeeting, getMeetings, updateMeeting, type MeetingDto } from '../api/meetings'
import { MeetingEditModal } from '../components/MeetingEditModal'
import { MeetingCreateModal } from '../components/MeetingCreateModal'
import { MeetingsDayModal } from '../components/MeetingsDayModal'

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
  const [editServerError, setEditServerError] = useState<string | null>(null)

  const MEETINGS_KEY = ['meetings'] as const

  const meetingsQuery = useQuery({
    queryKey: MEETINGS_KEY,
    queryFn: getMeetings,
  })

  const createMut = useMutation({
    mutationFn: (data: { title: string; date: string; time?: string }) => createMeeting(data),
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
    setCreateServerError(null)
    setIsAddOpen(true)
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

  function handleAddSubmit() {
    const date = newMeetingDate
    const title = newMeetingTitle.trim()
    if (!date || !title) return

    createMut.mutate(
      { title, date, time: newMeetingTime || undefined },
      {
        onSuccess: () => {
          setNewMeetingDate('')
          setNewMeetingTitle('')
          setNewMeetingTime('')
          if (date) setViewMonthForDate(date)
          setIsAddOpen(false)
        },
      },
    )
  }

  return (
    <div className="tasks-page tf-tasks">
      <TasksPageHeader user={user} onLogout={logout} />

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
                {(meetingsQuery.data ?? [])
                  .filter((m) => m.date === dateKey(day))
                  .map((m) => (
                    <button
                      key={m._id}
                      type="button"
                      className="tf-cal-badge tf-cal-badge-btn"
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

      {dayModalDate ? (
        <MeetingsDayModal
          date={dayModalDate}
          meetings={(meetingsQuery.data ?? []).filter((m) => m.date === dayModalDate)}
          onSelectMeeting={(m) => {
            closeDayMeetings()
            openEditMeeting(m)
          }}
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
        />
      ) : null}
    </div>
  )
}

