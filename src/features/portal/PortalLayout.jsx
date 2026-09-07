import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getActivePortalScreenLabel, getSidebarUserDetails, getVisiblePortalNavigation } from './portal.logic'
import { usePortalSignOut } from './usePortalSignOut'
import './PortalLayout.css'

/** Shared authenticated shell that renders a persistent sidebar around the route Outlet. */
export function PortalLayout({ user, role, onSignOut }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOutError, handleSignOut } = usePortalSignOut(onSignOut, navigate)
  const { userName, roleLabel } = getSidebarUserDetails(user, role)
  const activeScreenLabel = getActivePortalScreenLabel(location.pathname)
  const visibleNavigation = getVisiblePortalNavigation(role)

  return (
    <main className="home-page">
      <div className="home-layout">
        <aside className="user-sidebar" aria-label="Signed-in user menu">
          <div>
            <div className="brand-mark sidebar-brand" aria-hidden="true">LP</div>
            <p className="sidebar-label">Signed in as</p>
            <strong className="sidebar-name">{userName}</strong>
            {/* The sidebar displays only the trusted claim role, never the sign-in email address. */}
            <p className="sidebar-role">{roleLabel}</p>
            <nav className="sidebar-navigation" aria-label="Portal navigation">
              {visibleNavigation.map((item) => (
                <NavLink className={({ isActive }) => `sidebar-nav-button ${isActive ? 'sidebar-nav-active' : ''}`} key={item.path} to={item.path}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div>
            {signOutError && <p className="error" role="alert">{signOutError}</p>}
            <button className="sign-out-button" type="button" onClick={handleSignOut}>Sign out</button>
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
