import type { User } from '../types/auth'
import { NavLink } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { fetchNotifications } from '../api/notifications'

type TasksPageHeaderProps = {
  user: User | null
  onLogout: () => void
}

function initialsFromEmail(email: string) {
  const local = email.split('@')[0] ?? email
  const letters = local.replace(/[^a-zA-Z]/g, '')
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase()
  return local.slice(0, 2).toUpperCase() || 'TF'
}

export function TasksPageHeader({ user, onLogout }: TasksPageHeaderProps) {
  const [unreadMeetingsCount, setUnreadMeetingsCount] = useState(0)
  const [headerToasts, setHeaderToasts] = useState<string[]>([])

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    fetchNotifications()
      .then((items) => {
        if (!alive) return
        const unread = items.filter((n) => !n.read).length
        setUnreadMeetingsCount(unread)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user?.id])

  const shouldShowUnreadToast = useMemo(() => {
    if (!user?.id) return false
    if (unreadMeetingsCount <= 0) return false
    try {
      return sessionStorage.getItem('tf:meetings:unreadToastShown') !== '1'
    } catch {
      return false
    }
  }, [unreadMeetingsCount, user?.id])

  useEffect(() => {
    if (!shouldShowUnreadToast) return
    const msg = `You have ${unreadMeetingsCount} new meeting update${unreadMeetingsCount === 1 ? '' : 's'}`
    setHeaderToasts((prev) => [...prev, msg])
    try {
      sessionStorage.setItem('tf:meetings:unreadToastShown', '1')
    } catch {}
    const t = window.setTimeout(() => {
      setHeaderToasts((prev) => prev.filter((x) => x !== msg))
    }, 3800)
    return () => window.clearTimeout(t)
  }, [shouldShowUnreadToast, unreadMeetingsCount])

  return (
    <header className="tf-top-nav">
      <div className="tf-top-nav-inner">
        <div className="tf-nav-brand">
          <span className="tf-nav-logo" aria-hidden>
            <span className="tf-nav-logo-bars" />
          </span>
          <span className="tf-logo-text">
            TeamFlow <small>WORKSPACE</small>
          </span>
        </div>

        <nav className="tf-nav-tabs" aria-label="Primary navigation">
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `tf-nav-tab ${isActive ? 'tf-nav-tab-active' : 'tf-nav-tab-muted'}`
            }
          >
            <span className="tf-nav-tab-icon" aria-hidden>
              ☰
            </span>
            Tasks
          </NavLink>
          <NavLink
            to="/meetings"
            className={({ isActive }) =>
              `tf-nav-tab ${isActive ? 'tf-nav-tab-active' : 'tf-nav-tab-muted'}`
            }
          >
            <span className="tf-nav-tab-icon" aria-hidden>
              ▣
            </span>
            <span className="tf-nav-tab-text">
              Meetings
              {unreadMeetingsCount > 0 ? (
                <span className="tf-nav-updates-badge" aria-label={`${unreadMeetingsCount} unread meeting updates`}>
                  {unreadMeetingsCount}
                </span>
              ) : null}
            </span>
          </NavLink>
        </nav>

        <div className="tf-nav-user">
          <button
            type="button"
            className="tasks-logout tf-logout-icon"
            onClick={onLogout}
            aria-label="Logout"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
          {user ? (
            <>
              <div className="tf-avatar" aria-hidden>
                {initialsFromEmail(user.email)}
              </div>
              <div className="tf-user-text">
                <div className="tf-user-name-row">
                  <span className="tf-user-email">{user.email}</span>
                  <span
                    className={`tf-role-pill ${user.role === 'admin' ? 'tf-role-admin' : ''}`}
                  >
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
      {headerToasts.length > 0 ? (
        <div className="tf-toast-stack tf-toast-topright tf-toast-global" aria-live="polite">
          {headerToasts.map((t, idx) => (
            <div key={`${idx}-${t}`} className="tf-toast" role="status">
              {t}
            </div>
          ))}
        </div>
      ) : null}
    </header>
  )
}
