import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, authPersistenceReady } from './firebase'
import { PortalLayout } from './features/portal/PortalLayout'
import { canViewLearnerProgress, getUserRole } from './features/auth/auth.logic'

// Each screen is fetched only when its route is visited, keeping Login lightweight for first-time learners.
const AuthPage = lazy(() => import('./features/auth/AuthPage').then((module) => ({ default: module.AuthPage })))
const HomeOverview = lazy(() => import('./features/home/HomeOverview').then((module) => ({ default: module.HomeOverview })))
const LearningContent = lazy(() => import('./features/learning/LearningContent').then((module) => ({ default: module.LearningContent })))
const LearnerProgress = lazy(() => import('./features/progress/LearnerProgress').then((module) => ({ default: module.LearnerProgress })))
const TaskManager = lazy(() => import('./features/tasks/TaskManager').then((module) => ({ default: module.TaskManager })))
const DocumentLibrary = lazy(() => import('./features/documents/DocumentLibrary').then((module) => ({ default: module.DocumentLibrary })))

/**
 * Blocks portal routes until Firebase has restored a signed-in user for this
 * browser session. A user cannot gain portal access merely by typing a URL.
 */
function ProtectedPortal({ isAuthLoading, session }) {
  // Waiting prevents a brief redirect to Login while Firebase checks sessionStorage after a refresh.
  if (isAuthLoading) {
    return <main className="route-loading" aria-live="polite">Restoring your session...</main>
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />
}

/** Blocks the progress route even when a student manually enters its URL. */
function ProtectedLearnerProgress({ role }) {
  return canViewLearnerProgress(role) ? <Outlet /> : <Navigate to="/home" replace />
}

/**
 * Creates the small piece of React display state needed by protected routes.
 * The role is read from Firebase's signed ID token instead of browser storage,
 * because a browser user must never be able to choose their own permissions.
 */
async function createPortalSession(user) {
  let role = 'student'

  try {
    role = await getUserRole(user)
  } catch {
    // A failed claim read must never accidentally grant progress access.
  }

  return { user, role }
}

/**
 * Application composition root.
 * It owns only session-level state, route definitions, and the authenticated shared layout;
 * individual screens and their Firebase workflows live in their feature module.
 */
function App() {
  // React keeps only display state in memory. Firebase restores the trusted user
  // from its browser-session credential after refresh; the role comes from the ID token.
  const [session, setSession] = useState(null)
  // Prevents routes from making a decision until Firebase has checked for a current session.
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  /**
   * Builds temporary React state after a form login or registration.
   * It deliberately stores no password: Firebase has already handled it.
   */
  async function handleAuthenticated(user) {
    const nextSession = await createPortalSession(user)

    // A slower role lookup for an account that has just signed out must not
    // overwrite the identity of the account that is currently authenticated.
    if (auth.currentUser?.uid !== user.uid) return

    setSession(nextSession)
    setIsAuthLoading(false)
  }

  useEffect(() => {
    // Firebase owns the session credential. This observer is the approved way
    // to rebuild React's temporary user/role state after login, logout, or refresh.
    let unsubscribe
    let isComponentMounted = true

    async function restoreSession(user) {
      if (!user) {
        if (isComponentMounted) {
          setSession(null)
          setIsAuthLoading(false)
        }
        return
      }

      // Reuse the same claim lookup as a new login so route permissions remain consistent.
      const nextSession = await createPortalSession(user)

      // The claim request may finish after unmounting or after another person
      // signs in. Compare UIDs so a stale async request never shows the wrong name.
      if (isComponentMounted && auth.currentUser?.uid === user.uid) {
        setSession(nextSession)
        setIsAuthLoading(false)
      }
    }

    // Persistence must be ready before subscribing, otherwise the first auth state
    // event could occur before Firebase has restored the browser-session credential.
    authPersistenceReady
      .then(() => {
        if (isComponentMounted) {
          unsubscribe = onAuthStateChanged(auth, restoreSession)
        }
      })
      .catch(() => {
        // If session storage is unavailable, fail closed and show Login instead of assuming identity.
        if (isComponentMounted) {
          setSession(null)
          setIsAuthLoading(false)
        }
      })

    // Prevents an async Firebase callback changing state after the application unmounts.
    return () => {
      isComponentMounted = false
      unsubscribe?.()
    }
  }, [])

  /** Clears Firebase's tab session before the layout sends the learner to Login. */
  async function handleSignOut() {
    await signOut(auth)
    setSession(null)
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<main className="route-loading" aria-live="polite">Loading your portal...</main>}>
      <Routes>
        {/* The root URL has no content of its own: it directs people into the Login journey. */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Prevents the Login form briefly appearing while Firebase restores a valid session after refresh. */}
        <Route
          path="/login"
          element={isAuthLoading
            ? <main className="route-loading" aria-live="polite">Restoring your session...</main>
            : session
              ? <Navigate to="/home" replace />
              : <AuthPage onAuthenticated={handleAuthenticated} />}
        />

        {/* All learner pages share one persistent sidebar and need a Firebase-authenticated user. */}
        <Route element={<ProtectedPortal isAuthLoading={isAuthLoading} session={session} />}>
          <Route element={<PortalLayout user={session?.user} role={session?.role} onSignOut={handleSignOut} />}>
            <Route path="/home" element={<HomeOverview user={session?.user} />} />
            <Route path="/learning" element={<LearningContent user={session?.user} />} />
            <Route element={<ProtectedLearnerProgress role={session?.role} />}>
              <Route path="/progress" element={<LearnerProgress />} />
            </Route>
            <Route path="/tasks" element={<TaskManager user={session?.user} />} />
            <Route path="/documents" element={<DocumentLibrary user={session?.user} />} />
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
