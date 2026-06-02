import { useEffect, useMemo, useRef, useState } from 'react'

export type MeetingInviteUser = {
  _id: string
  email: string
}

type MeetingCreateModalProps = {
  title: string
  date: string
  time: string
  onTitleChange: (v: string) => void
  onDateChange: (v: string) => void
  onTimeChange: (v: string) => void
  onCreate: () => void
  onClose: () => void
  isPending: boolean
  serverError?: string | null
  isAdmin?: boolean
  inviteAllUsers?: boolean
  onInviteAllUsersChange?: (value: boolean) => void
  participantIds?: string[]
  onParticipantIdsChange?: (ids: string[]) => void
  inviteUsers?: MeetingInviteUser[]
}

function isPastDate(dateStr: string) {
  const selected = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(selected.getTime())) return false
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  return selected < todayStart
}

export function MeetingCreateModal({
  title,
  date,
  time,
  onTitleChange,
  onDateChange,
  onTimeChange,
  onCreate,
  onClose,
  isPending,
  serverError,
  isAdmin = false,
  inviteAllUsers = false,
  onInviteAllUsersChange,
  participantIds = [],
  onParticipantIdsChange,
  inviteUsers = [],
}: MeetingCreateModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const userPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!serverError) return
    const t = setTimeout(() => setError(serverError), 0)
    return () => clearTimeout(t)
  }, [serverError])

  useEffect(() => {
    if (!inviteAllUsers) return
    if (participantIds.length === 0) return
    onParticipantIdsChange?.([])
    setUserQuery('')
  }, [inviteAllUsers, onParticipantIdsChange, participantIds.length])

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!userPickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const selectedSet = useMemo(() => new Set(participantIds), [participantIds])
  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    const base = inviteUsers.filter((u) => !selectedSet.has(u._id))
    if (!q) return base.slice(0, 8)
    const matches = base.filter((u) => {
      const email = u.email.toLowerCase()
      return email.startsWith(q) || email.includes(q)
    })
    return matches.slice(0, 8)
  }, [inviteUsers, selectedSet, userQuery])

  const selectedUsers = useMemo(() => {
    if (participantIds.length === 0) return []
    const byId = new Map(inviteUsers.map((u) => [u._id, u] as const))
    return participantIds
      .map((id) => byId.get(id))
      .filter(Boolean) as MeetingInviteUser[]
  }, [inviteUsers, participantIds])

  function selectInviteAllUsers() {
    onInviteAllUsersChange?.(true)
    onParticipantIdsChange?.([])
    setUserQuery('')
    setIsOpen(false)
  }

  function clearInviteAllUsers() {
    onInviteAllUsersChange?.(false)
  }

  function addParticipant(id: string) {
    if (selectedSet.has(id)) return
    if (inviteAllUsers) {
      onInviteAllUsersChange?.(false)
      onParticipantIdsChange?.([id])
    } else {
      onParticipantIdsChange?.([...participantIds, id])
    }
    setUserQuery('')
  }

  function removeParticipant(id: string) {
    onParticipantIdsChange?.(participantIds.filter((x) => x !== id))
  }

  const showUserDropdown = isOpen && !isPending && !inviteAllUsers

  function handleCreate() {
    if (!date || !title.trim()) return
    if (isPastDate(date)) {
      setError('The selected date has already passed')
      return
    }
    setError(null)
    onCreate()
  }

  return (
    <div className="tf-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tf-modal-dialog tf-review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tf-meeting-create-title"
        onClick={(e) => e.stopPropagation()}
      >
        <section className="tasks-section tf-panel">
          <div className="tf-review-head">
            <div className="tf-review-head-left">
              <h2 id="tf-meeting-create-title" className="tf-review-title">
                Create meeting
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

          <div className="tf-meeting-create-body">
            <div className="tf-review-section tf-meeting-create-section">
              <div className="tf-meeting-form">
                <label className="tf-meeting-field">
                  <span className="tf-meeting-label">Title</span>
                  <input
                    value={title}
                    onChange={(e) => {
                      setError(null)
                      onTitleChange(e.target.value)
                    }}
                    disabled={isPending}
                    placeholder="Meeting title"
                  />
                </label>

                <div className="tf-meeting-row">
                  <label className="tf-meeting-field">
                    <span className="tf-meeting-label">Date</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setError(null)
                        onDateChange(e.target.value)
                      }}
                      disabled={isPending}
                      required
                    />
                  </label>
                  <label className="tf-meeting-field">
                    <span className="tf-meeting-label">Time</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        setError(null)
                        onTimeChange(e.target.value)
                      }}
                      disabled={isPending}
                    />
                  </label>
                </div>
              </div>

              {error ? <div className="tf-inline-error">{error}</div> : null}
            </div>

            {isAdmin ? (
              <>
                <div className="tf-review-divider tf-meeting-create-divider" aria-hidden />
                <div className="tf-meeting-invite-panel">
                  <label className="tf-meeting-field tf-meeting-participants-field">
                    <span className="tf-meeting-label">Invite</span>
                    <div
                      ref={userPickerRef}
                      className={`tf-meeting-userpicker${isOpen ? ' tf-meeting-userpicker-open' : ''}`}
                    >
                      <input
                        className="tf-meeting-userpicker-input"
                        placeholder="Search users..."
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        onFocus={() => {
                          if (isPending) return
                          setIsOpen(true)
                        }}
                        onClick={() => {
                          if (isPending) return
                          setIsOpen(true)
                        }}
                        disabled={isPending}
                        aria-label="Invite users"
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                      />

                      {inviteAllUsers || selectedUsers.length > 0 ? (
                        <div
                          className="tf-meeting-userpicker-chips"
                          aria-label={inviteAllUsers ? 'Invite all users' : 'Selected users'}
                        >
                          {inviteAllUsers ? (
                            <button
                              type="button"
                              className="tf-chip"
                              disabled={isPending}
                              onClick={clearInviteAllUsers}
                              aria-label="Remove invite all users"
                            >
                              <span className="tf-chip-text">Invite all users</span>
                              <span className="tf-chip-x" aria-hidden>
                                ×
                              </span>
                            </button>
                          ) : (
                            selectedUsers.map((u) => (
                              <button
                                key={u._id}
                                type="button"
                                className="tf-chip"
                                disabled={isPending}
                                onClick={() => removeParticipant(u._id)}
                                aria-label={`Remove ${u.email}`}
                              >
                                <span className="tf-chip-text">{u.email}</span>
                                <span className="tf-chip-x" aria-hidden>
                                  ×
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}

                      {showUserDropdown ? (
                        <div className="tf-meeting-userpicker-dropdown" role="listbox">
                          {!inviteAllUsers ? (
                            <button
                              type="button"
                              className="tf-meeting-userpicker-option tf-meeting-userpicker-option-all"
                              onClick={selectInviteAllUsers}
                              role="option"
                            >
                              <span className="tf-meeting-userpicker-option-icon" aria-hidden>
                                ✓
                              </span>
                              Invite all users
                            </button>
                          ) : null}
                          {filteredUsers.length === 0 ? (
                            <div className="tf-meeting-userpicker-option-empty" role="option" aria-disabled="true">
                              No users found
                            </div>
                          ) : null}
                          {filteredUsers.map((u) => (
                            <button
                              key={u._id}
                              type="button"
                              className="tf-meeting-userpicker-option"
                              onClick={() => addParticipant(u._id)}
                              role="option"
                            >
                              {u.email}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </label>
                </div>
              </>
            ) : null}
          </div>

          <div className="tf-review-divider" aria-hidden />

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
                className="tf-btn-success"
                onClick={handleCreate}
                disabled={isPending || !title.trim() || !date}
              >
                {isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

