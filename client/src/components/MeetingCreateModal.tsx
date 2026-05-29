import { useEffect, useState } from 'react'

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
}: MeetingCreateModalProps) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!serverError) return
    const t = setTimeout(() => setError(serverError), 0)
    return () => clearTimeout(t)
  }, [serverError])

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
              <div className="tf-review-kicker">Meeting</div>
              <h2 id="tf-meeting-create-title" className="tf-review-title">
                Add meeting
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
            <div className="tf-review-section-title">Details</div>
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

              {error ? <div className="tf-inline-error">{error}</div> : null}
            </div>
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

