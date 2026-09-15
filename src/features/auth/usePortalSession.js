import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, authPersistenceReady } from '../../firebase'
import { getUserRole } from './auth.logic'

/**
 * Reads the role from Firebase's signed ID token and creates only temporary React display state.
 * The browser must never choose its own role, and this function deliberately stores no password.
 */
async function createPortalSession(user) {
  let role = 'student'

  try {
    role = await getUserRole(user)
  } catch {
    // If the Custom Claim cannot be read, fail safely with the least-privileged role.
  }

  return { user, role }
}

/**
 * Keeps Firebase Authentication lifecycle code outside visual and routing components.
 * Firebase restores its managed browser-session credential after refresh; this hook rebuilds
 * React's in-memory session state from it without writing credentials, profile data, or passwords.
 */
export function usePortalSession() {
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  /** Updates temporary session state after Login or Registration has authenticated a Firebase user. */
  async function handleAuthenticated(user) {
    const nextSession = await createPortalSession(user)

    // A slower claim lookup for a person who signed out must not replace the current person's identity.
    if (auth.currentUser?.uid !== user.uid) return

    setSession(nextSession)
    setIsAuthLoading(false)
  }

  useEffect(() => {
    let unsubscribe
    let isComponentMounted = true

    /** Restores session state whenever Firebase reports a sign-in, sign-out, or browser refresh. */
    async function restoreSession(user) {
      if (!user) {
        if (isComponentMounted) {
          setSession(null)
          setIsAuthLoading(false)
        }
        return
      }

      const nextSession = await createPortalSession(user)

      // The asynchronous ID-token read can finish after another account signs in, so compare UIDs first.
      if (isComponentMounted && auth.currentUser?.uid === user.uid) {
        setSession(nextSession)
        setIsAuthLoading(false)
      }
    }

    // Persistence must finish first so Firebase can restore the correct session before routes decide access.
    authPersistenceReady
      .then(() => {
        if (isComponentMounted) {
          unsubscribe = onAuthStateChanged(auth, restoreSession)
        }
      })
      .catch(() => {
        // Session storage unavailable means no trusted restored identity, so the app safely returns to Login.
        if (isComponentMounted) {
          setSession(null)
          setIsAuthLoading(false)
        }
      })

    // Prevents a Firebase callback from changing state after this hook's component has unmounted.
    return () => {
      isComponentMounted = false
      unsubscribe?.()
    }
  }, [])

  /** Removes Firebase's session credential before the router returns the learner to Login. */
  async function handleSignOut() {
    await signOut(auth)
    setSession(null)
  }

  return {
    session,
    isAuthLoading,
    handleAuthenticated,
    handleSignOut,
  }
}
