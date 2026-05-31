import type { MeetingDto } from '../api/meetings'

type MeetingsDayModalProps = {
  date: string // YYYY-MM-DD
  meetings: MeetingDto[]
  onSelectMeeting: (m: MeetingDto) => void
  onDeleteMeeting?: (m: MeetingDto) => void
  onClose: () => void
  isDeleting?: boolean
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function MeetingsDayModal({
  date,
  meetings,
  onSelectMeeting,
  onDeleteMeeting,
  onClose,
  isDeleting = false,
}: MeetingsDayModalProps) {
  const prettyDate = formatDate(date)

  return (
    <div className="tf-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tf-modal-dialog tf-review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tf-meetings-day-title"
        onClick={(e) => e.stopPropagation()}
      >
        <section className="tasks-section tf-panel">
          <div className="tf-review-head tf-meetings-day-head">
            <div className="tf-review-head-left">
              <h2 id="tf-meetings-day-title" className="tf-review-title">
                Meetings
              </h2>
              <div className="tf-review-subtitle">{prettyDate}</div>
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

          {meetings.length === 0 ? (
            <p className="tf-meetings-day-empty">No meetings for this day.</p>
          ) : (
            <div className="tf-meetings-day-list" role="list">
              {meetings.map((m) => (
                <div key={m._id} className="tf-meetings-day-item" role="listitem">
                  <button
                    type="button"
                    className="tf-meetings-day-item-main"
                    onClick={() => onSelectMeeting(m)}
                    aria-label={`Edit meeting: ${m.title}`}
                  >
                    <div className="tf-meetings-day-title">
                      {m.title?.trim() ? m.title : 'Untitled'}
                    </div>
                    <div className="tf-meetings-day-meta">
                      {m.time?.trim() ? m.time : '—'}
                    </div>
                  </button>
                  {onDeleteMeeting ? (
                    <button
                      type="button"
                      className="tf-meetings-day-delete"
                      onClick={() => onDeleteMeeting(m)}
                      disabled={isDeleting}
                      aria-label={`Delete meeting: ${m.title}`}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <div className="tf-review-divider" aria-hidden />

          <div className="tf-review-actions-row">
            <button type="button" className="tf-btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

