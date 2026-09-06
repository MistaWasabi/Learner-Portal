import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { PortalLayout } from './features/portal/PortalLayout'

// Each screen is fetched only when its route is visited, keeping Login lightweight for first-time learners.
const AuthPage = lazy(() => import('./features/auth/AuthPage').then((module) => ({ default: module.AuthPage })))
const HomeOverview = lazy(() => import('./features/home/HomeOverview').then((module) => ({ default: module.HomeOverview })))
const LearningContent = lazy(() => import('./features/learning/LearningContent').then((module) => ({ default: module.LearningContent })))
const LearnerProgress = lazy(() => import('./features/progress/LearnerProgress').then((module) => ({ default: module.LearnerProgress })))
const TaskManager = lazy(() => import('./features/tasks/TaskManager').then((module) => ({ default: module.TaskManager })))
const DocumentLibrary = lazy(() => import('./features/documents/DocumentLibrary').then((module) => ({ default: module.DocumentLibrary })))

/**
 * Blocks portal routes when the in-memory session does not exist.
 * This preserves the intentional security decision that a page refresh returns to Login.
 */
function ProtectedPortal({ user }) {
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

/**
 * Application composition root.
 * It owns only session-level state, route definitions, and the authenticated shared layout;
 * individual screens and their Firebase workflows live in their feature module.
 */
function App() {
  const [signedInUser, setSignedInUser] = useState(null)

  /** Clears Firebase's tab session before the layout sends the learner to Login. */
  async function handleSignOut() {
    await signOut(auth)
    setSignedInUser(null)
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<main className="route-loading" aria-live="polite">Loading your portal...</main>}>
      <Routes>
        {/* The root URL has no content of its own: it directs people into the Login journey. */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={signedInUser ? <Navigate to="/home" replace /> : <AuthPage onAuthenticated={setSignedInUser} />}
        />

        {/* All learner pages share one persistent sidebar and require the memory-only user object. */}
        <Route element={<ProtectedPortal user={signedInUser} />}>
          <Route element={<PortalLayout user={signedInUser} onSignOut={handleSignOut} />}>
            <Route path="/home" element={<HomeOverview user={signedInUser} />} />
            <Route path="/learning" element={<LearningContent user={signedInUser} />} />
            <Route path="/progress" element={<LearnerProgress />} />
            <Route path="/tasks" element={<TaskManager user={signedInUser} />} />
            <Route path="/documents" element={<DocumentLibrary user={signedInUser} />} />
          </Route>
        </Route>

        {/* Unknown URLs follow the same safe entry point as a fresh browser session. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
