import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { canViewLearnerProgress, getRoleLabel, isAdmin } from '../auth/auth.logic'
import './PortalLayout.css'

// One navigation definition keeps sidebar links and the displayed heading consistent.
const portalNavigation = [
  { path: '/home', label: 'Home' },
  { path: '/learning', label: 'Learning' },
  { path: '/progress', label: 'Learner progress', requiresProgressAccess: true },
  { path: '/admin', label: 'Admin database', requiresAdminAccess: true },
  { path: '/tasks', label: 'Task manager' },
  { path: '/documents', label: 'Document library' },
]

/**
 * Shared shell for every authenticated route.
 * Outlet is the React Router placeholder that swaps only the current screen while the sidebar remains mounted.
 */
export function PortalLayout({ user, role, onSignOut }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState('')
  const activeScreenLabel = portalNavigation.find((item) => item.path === location.pathname)?.label ?? 'Learner Portal'
  const userName = user.displayName?.trim() || 'Learner'
  // The claim-derived role is formatted in auth.logic.js so the JSX only renders trusted display data.
  const roleLabel = getRoleLabel(role)

  /** Signs out first, then replaces browser history so Back cannot reveal a protected route. */
  async function handleSignOut() {
    setSignOutError('')
    try {
      await onSignOut()
      navigate('/login', { replace: true })
    } catch {
      setSignOutError('Unable to sign out. Please try again.')
    }
  }

  return (
    <main className="home-page">
      <div className="home-layout">
        <aside className="user-sidebar" aria-label="Signed-in user menu">
          <div>
            <div className="brand-mark sidebar-brand" aria-hidden="true">LP</div>
            <p className="sidebar-label">Signed in as</p>
            <strong className="sidebar-name">{userName}</strong>
            {/* Shows the trusted Custom Claim beneath the username without exposing an email address. */}
            <p className="sidebar-role">{roleLabel}</p>
            <nav className="sidebar-navigation" aria-label="Portal navigation">
              {portalNavigation
                .filter((item) => (
                  (!item.requiresProgressAccess || canViewLearnerProgress(role)) &&
                  (!item.requiresAdminAccess || isAdmin(role))
                ))
                .map((item) => (
                <NavLink
                  className={({ isActive }) => `sidebar-nav-button ${isActive ? 'sidebar-nav-active' : ''}`}
                  key={item.path}
                  to={item.path}
                >
                  {item.label}
                </NavLink>
                ))}
            </nav>
          </div>
          <div>
            {signOutError && <p className="error" role="alert">{signOutError}</p>}
            <button className="sign-out-button" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </aside>

        <section className="dashboard-content" aria-labelledby="dashboard-heading">
          <header className="dashboard-heading">
            <p className="eyebrow">Learner Portal</p>
            <h1 id="dashboard-heading">{activeScreenLabel}</h1>
          </header>
          <Outlet />
        </section>
      </div>
    </main>
  )
}
