import { Navigate, Outlet } from 'react-router-dom'
import { canViewLearnerProgress, isAdmin } from '../features/auth/auth.logic'

/** Blocks every authenticated portal route until Firebase has restored a user for this browser session. */
export function ProtectedPortal({ isAuthLoading, session }) {
  // Waiting prevents a momentary Login redirect while Firebase restores its session credential after refresh.
  if (isAuthLoading) {
    return <main className="route-loading" aria-live="polite">Restoring your session...</main>
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />
}

/** Stops students accessing learner-progress data simply by typing the protected URL. */
export function ProtectedLearnerProgress({ role }) {
  return canViewLearnerProgress(role) ? <Outlet /> : <Navigate to="/home" replace />
}

/** Stops non-Admin accounts accessing user emails or all-task records through the Administrator route. */
export function ProtectedAdmin({ role }) {
  return isAdmin(role) ? <Outlet /> : <Navigate to="/home" replace />
}
