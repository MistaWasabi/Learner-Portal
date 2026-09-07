import { useState } from 'react'

/** Holds sidebar sign-out feedback and navigation, leaving PortalLayout to render the result. */
export function usePortalSignOut(onSignOut, navigate) {
  const [signOutError, setSignOutError] = useState('')

  /** Signs out through the trusted session hook before replacing history with Login. */
  async function handleSignOut() {
    setSignOutError('')
    try {
      await onSignOut()
      navigate('/login', { replace: true })
    } catch {
      setSignOutError('Unable to sign out. Please try again.')
    }
  }

  return { signOutError, handleSignOut }
}
