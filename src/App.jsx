import { useState } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, authPersistenceReady } from './firebase'
import './App.css'

// Basic format check used before Firebase receives the email address.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Renders either the login form or the authenticated Home page. */
function App() {
  // Stores the values currently typed into the login form.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Controls interface feedback and the currently signed-in Firebase user.
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signedInUser, setSignedInUser] = useState(null)

  /** Returns an email validation message, or an empty string when valid. */
  function validateEmail(value) {
    if (!value.trim()) return 'Email address is required.'
    if (!emailPattern.test(value.trim())) return 'Enter a valid email address.'
    return ''
  }

  /** Returns a password validation message, or an empty string when present. */
  function validatePassword(value) {
    if (!value) return 'Password is required.'
    return ''
  }

  /** Validates the form and signs the learner in with Firebase Authentication. */
  async function handleSubmit(event) {
    event.preventDefault()

    // Stores the latest validation message for each input field.
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }

    setErrors(nextErrors)
    setAuthError('')

    if (nextErrors.email || nextErrors.password) return

    try {
      setIsSigningIn(true)
      // Applies memory-only persistence before beginning the Firebase sign-in.
      await authPersistenceReady
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      )
      setSignedInUser(userCredential.user)
    } catch {
      setAuthError('Unable to sign in with that email address and password.')
    } finally {
      setIsSigningIn(false)
    }
  }

  /** Updates the email field and refreshes any visible email error. */
  function handleEmailChange(event) {
    const value = event.target.value
    setEmail(value)
    setAuthError('')
    if (errors.email) setErrors((current) => ({ ...current, email: validateEmail(value) }))
  }

  /** Updates the password field and refreshes any visible password error. */
  function handlePasswordChange(event) {
    const value = event.target.value
    setPassword(value)
    setAuthError('')
    if (errors.password) {
      setErrors((current) => ({ ...current, password: validatePassword(value) }))
    }
  }

  /** Ends the Firebase session and returns the learner to the Login screen. */
  async function handleSignOut() {
    await signOut(auth)
    setSignedInUser(null)
    setEmail('')
    setPassword('')
    setErrors({})
    setAuthError('')
  }

  // A successful login replaces the form with the Home page for this session.
  if (signedInUser) {
    return <HomePage user={signedInUser} onSignOut={handleSignOut} />
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="brand-mark" aria-hidden="true">LP</div>
        <p className="eyebrow">Learner Portal</p>
        <h1 id="login-heading">Welcome back</h1>
        <p className="intro">Sign in to continue your learning journey.</p>

        <form noValidate onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => setErrors((current) => ({ ...current, email: validateEmail(email) }))}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder="you@example.com"
            />
            {errors.email && <p id="email-error" className="error">{errors.email}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => setErrors((current) => ({ ...current, password: validatePassword(password) }))}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                placeholder="Enter your password"
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <HiddenEyeIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <p id="password-error" className="error">{errors.password}</p>}
          </div>

          <button className="submit-button" type="submit" disabled={isSigningIn}>
            {isSigningIn ? 'Signing in...' : 'Sign in'}
          </button>
          {authError && <p className="error" role="alert">{authError}</p>}
        </form>
      </section>
    </main>
  )
}

/** Displays the signed-in user and the simple Home-page message. */
function HomePage({ user, onSignOut }) {
  // Shows only the email text before @, with a safe fallback for missing email data.
  const userName = user.email?.split('@')[0] || 'Learner'

  return (
    <main className="home-page">
      <aside className="user-sidebar" aria-label="Signed-in user menu">
        <p className="sidebar-label">Signed in as</p>
        <strong className="sidebar-name">{userName}</strong>
        <button className="sign-out-button" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </aside>

      <section className="home-card" aria-labelledby="home-heading">
        <h1 id="home-heading">Well done</h1>
      </section>
    </main>
  )
}

/** Displays the eye icon used when the password is hidden. */
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  )
}

/** Displays the crossed-out eye icon used when the password is visible. */
function HiddenEyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a17.7 17.7 0 0 1-3.1 3.7M6.2 6.2A17.8 17.8 0 0 0 2.5 12s3.4 6 9.5 6a10.7 10.7 0 0 0 3.1-.5" />
      <path d="M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4" />
    </svg>
  )
}

export default App
