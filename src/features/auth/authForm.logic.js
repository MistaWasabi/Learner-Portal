import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signOut,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth, authPersistenceReady } from '../../firebase'
import { ensureLearnerProgressSummary } from '../shared/portal.logic'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const emailVerificationRequiredCode = 'portal/email-verification-required'

/** Represents a successful Firebase credential check that is deliberately refused until its email owner is confirmed. */
class EmailVerificationRequiredError extends Error {
  constructor(message) {
    super(message)
    this.name = 'EmailVerificationRequiredError'
    this.code = emailVerificationRequiredCode
  }
}

/** Lets the visual form show an instructional status rather than treating an unverified account as invalid credentials. */
export function isEmailVerificationRequired(error) {
  return error.code === emailVerificationRequiredCode
}

/** Sends Firebase's signed link, clears the temporary Auth session, and prevents the unverified account entering the portal. */
async function requireVerifiedEmail(user, accountWasCreated) {
  let verificationLinkSent = false

  try {
    // Firebase owns the link's signature and expiry; the browser never generates or stores an email OTP.
    await sendEmailVerification(user)
    verificationLinkSent = true
  } catch {
    // A prior link may still be valid, or Firebase may temporarily rate-limit new messages.
  }

  try {
    // Ending the managed session prevents the just-created or unverified account from reaching protected routes.
    await signOut(auth)
  } catch {
    // Rules and route guards also require email verification, providing defence in depth if a local sign-out fails.
  }

  const accountMessage = accountWasCreated ? 'Your account was created.' : 'Your email address is not verified.'
  const linkMessage = verificationLinkSent
    ? ' Open the verification link in your sign-in inbox, then sign in again.'
    : ' Check your sign-in inbox for an existing verification link, then sign in again.'
  throw new EmailVerificationRequiredError(`${accountMessage}${linkMessage}`)
}

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
  if (isEmailVerificationRequired(error)) return error.message
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
    await requireVerifiedEmail(userCredential.user, true)
  }

  // A fresh user reload avoids relying on an older cached emailVerified value after the learner opens the email link.
  await reload(userCredential.user)
  if (!userCredential.user.emailVerified) await requireVerifiedEmail(userCredential.user, false)

  try {
    // This non-sensitive summary lets authorised staff view course totals without copying email addresses.
    await ensureLearnerProgressSummary(userCredential.user)
  } catch {
    // A valid authentication result remains valid if progress setup is temporarily unavailable.
  }

  return userCredential.user
}
