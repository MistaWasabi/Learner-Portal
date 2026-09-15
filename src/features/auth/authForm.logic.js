import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth, authPersistenceReady } from '../../firebase'
import { ensureLearnerProgressSummary } from '../shared/portal.logic'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Validates the username required only during registration before Firebase receives the request. */
export function validateUsername(value) {
  if (!value.trim()) return 'Username is required.'
  if (value.trim().length < 2) return 'Username must contain at least 2 characters.'
  return ''
}

/** Performs a basic front-end email format check; Firebase remains the authority for account identity. */
export function validateEmail(value) {
  if (!value.trim()) return 'Email address is required.'
  if (!emailPattern.test(value.trim())) return 'Enter a valid email address.'
  return ''
}

/** Checks the password is present and applies Firebase's minimum length before account creation. */
export function validatePassword(value, authMode) {
  if (!value) return 'Password is required.'
  if (authMode === 'register' && value.length < 6) return 'Password must contain at least 6 characters.'
  return ''
}

/** Builds all visible form errors together so a learner can correct every invalid field in one attempt. */
export function validateAuthForm({ authMode, username, email, password }) {
  return {
    username: authMode === 'register' ? validateUsername(username) : '',
    email: validateEmail(email),
    password: validatePassword(password, authMode),
  }
}

/** Converts Firebase Authentication failures into safe, learner-friendly feedback. */
export function getAuthenticationError(error, authMode) {
  if (error.code === 'auth/email-already-in-use') return 'An account already exists with this email address.'
  if (error.code === 'auth/weak-password') return 'Password must contain at least 6 characters.'
  return authMode === 'register'
    ? 'Unable to create your account. Please try again.'
    : 'Unable to sign in with that email address and password.'
}

/**
 * Runs the Firebase-only portion of Login or Registration outside the visual form.
 * Browser-session persistence is awaited before sign-in and this function never saves a password.
 */
export async function authenticatePortalUser({ authMode, username, email, password }) {
  await authPersistenceReady
  const userCredential = authMode === 'register'
    ? await createUserWithEmailAndPassword(auth, email.trim(), password)
    : await signInWithEmailAndPassword(auth, email.trim(), password)

  if (authMode === 'register') {
    await updateProfile(userCredential.user, { displayName: username.trim() })
  }

  try {
    // This non-sensitive summary lets authorised staff view course totals without copying email addresses.
    await ensureLearnerProgressSummary(userCredential.user)
  } catch {
    // A valid authentication result remains valid if progress setup is temporarily unavailable.
  }

  return userCredential.user
}
