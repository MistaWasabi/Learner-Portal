import { useState } from 'react'
import {
  authenticatePortalUser,
  getAuthenticationError,
  isEmailVerificationRequired,
  validateAuthForm,
  validateEmail,
  validatePassword,
  validateUsername,
} from './authForm.logic'

/**
 * Keeps authentication form state and Firebase calls outside Login and Registration visual markup.
 * Password state exists only for the active browser render and is cleared after every authentication attempt.
 */
export function useAuthForm({ authMode, onAuthenticated, navigate }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  /** Refreshes one field's feedback without mutating the existing error object. */
  function validateField(fieldName, value) {
    // Keeping these validators in the logic module means Login and Registration cannot accidentally use different rules.
    const validators = {
      username: validateUsername,
      email: validateEmail,
      password: (passwordValue) => validatePassword(passwordValue, authMode),
    }
    setErrors((current) => ({ ...current, [fieldName]: validators[fieldName](value) }))
  }

  /** Updates one typed field and clears general Firebase feedback once the learner begins correcting it. */
  function changeField(fieldName, value) {
    const setters = { username: setUsername, email: setEmail, password: setPassword }
    setters[fieldName](value)
    setAuthError('')
    setAuthNotice('')

    if (errors[fieldName]) validateField(fieldName, value)
  }

  /** Validates the whole form, authenticates with Firebase, then hands the trusted user to the route session hook. */
  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateAuthForm({ authMode, username, email, password })

    setErrors(nextErrors)
    setAuthError('')
    setAuthNotice('')
    if (nextErrors.username || nextErrors.email || nextErrors.password) return

    try {
      setIsSigningIn(true)
      const user = await authenticatePortalUser({ authMode, username, email, password })

      // Username/email copies are no longer needed after Firebase has authenticated this account.
      setUsername('')
      setEmail('')
      await onAuthenticated(user)
      navigate('/home', { replace: true })
    } catch (error) {
      // An unverified account is a real account with an instruction, not a wrong-password error.
      if (isEmailVerificationRequired(error)) {
        // The credential attempt is complete, so keep no email or username value in this rendered form.
        setUsername('')
        setEmail('')
        setAuthNotice(getAuthenticationError(error, authMode))
      } else {
        setAuthError(getAuthenticationError(error, authMode))
      }
    } finally {
      // Clearing the field is the only password lifecycle this application owns.
      setPassword('')
      setIsSigningIn(false)
    }
  }

  return {
    username,
    email,
    password,
    showPassword,
    errors,
    authError,
    authNotice,
    isSigningIn,
    changeField,
    validateField,
    handleSubmit,
    togglePasswordVisibility: () => setShowPassword((visible) => !visible),
  }
}
