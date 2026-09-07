import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { usePortalSession } from '../features/auth/usePortalSession'
import { PortalLayout } from '../features/portal/PortalLayout'
import { ProtectedAdmin, ProtectedLearnerProgress, ProtectedPortal } from './RouteGuards'

// Each screen is downloaded only when its route is visited, keeping the first Login load lightweight.
const Login = lazy(() => import('../features/auth/Login').then((module) => ({ default: module.Login })))
const Registration = lazy(() => import('../features/auth/Registration').then((module) => ({ default: module.Registration })))
const HomeOverview = lazy(() => import('../features/home/HomeOverview').then((module) => ({ default: module.HomeOverview })))
const LearningContent = lazy(() => import('../features/learning/LearningContent').then((module) => ({ default: module.LearningContent })))
const LearnerProgress = lazy(() => import('../features/progress/LearnerProgress').then((module) => ({ default: module.LearnerProgress })))
const TaskManager = lazy(() => import('../features/tasks/TaskManager').then((module) => ({ default: module.TaskManager })))
const DocumentLibrary = lazy(() => import('../features/documents/DocumentLibrary').then((module) => ({ default: module.DocumentLibrary })))
const AdminDatabase = lazy(() => import('../features/admin/AdminDatabase').then((module) => ({ default: module.AdminDatabase })))

/**
 * Central URL-to-screen mapping for the Learner Portal.
 * Authentication state and Firebase behaviour are imported from usePortalSession so this component
 * focuses on route composition and the persistent layout only.
 */
export function PortalRouter() {
  const { session, isAuthLoading, handleAuthenticated, handleSignOut } = usePortalSession()

  return (
    <BrowserRouter>
      <Suspense fallback={<main className="route-loading" aria-live="polite">Loading your portal...</main>}>
        <Routes>
          {/* The root URL directs a new browser session into the Login journey. */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          {/* A valid restored session bypasses Login; a missing session sees only the Login journey. */}
          <Route
            path="/login"
            element={isAuthLoading
              ? <main className="route-loading" aria-live="polite">Restoring your session...</main>
              : session
                ? <Navigate to="/home" replace />
                : <Login onAuthenticated={handleAuthenticated} />}
          />
          {/* Registration is an independent route and visual component, not a mode hidden within Login. */}
          <Route
            path="/register"
            element={isAuthLoading
              ? <main className="route-loading" aria-live="polite">Restoring your session...</main>
              : session
                ? <Navigate to="/home" replace />
                : <Registration onAuthenticated={handleAuthenticated} />}
          />

          {/* All authenticated screens inherit the persistent sidebar from this shared route layout. */}
          <Route element={<ProtectedPortal isAuthLoading={isAuthLoading} session={session} />}>
            <Route element={<PortalLayout user={session?.user} role={session?.role} onSignOut={handleSignOut} />}>
              <Route path="/home" element={<HomeOverview user={session?.user} />} />
              <Route path="/learning" element={<LearningContent user={session?.user} />} />
              <Route element={<ProtectedLearnerProgress role={session?.role} />}>
                <Route path="/progress" element={<LearnerProgress />} />
              </Route>
              <Route element={<ProtectedAdmin role={session?.role} />}>
                <Route path="/admin" element={<AdminDatabase user={session?.user} />} />
              </Route>
              <Route path="/tasks" element={<TaskManager user={session?.user} />} />
              <Route path="/documents" element={<DocumentLibrary user={session?.user} />} />
            </Route>
          </Route>

          {/* Unknown URLs follow the safe entry point rather than exposing an unprotected blank screen. */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
