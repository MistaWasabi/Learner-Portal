import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, authPersistenceReady } from './firebase'
import './App.css'

// Basic format check used before Firebase receives the email address.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Temporary summary values that will later be replaced by learner data from Firebase.
const learningSummary = [
  { label: 'Courses in progress', value: '3' },
  { label: 'Lessons completed', value: '18' },
  { label: 'Learning streak', value: '5 days' },
]

// Temporary course rows shown in the Home-page learning table.
const courseRows = [
  { course: 'Web Development Basics', progress: '72%', nextLesson: 'Responsive layouts' },
  { course: 'Introduction to JavaScript', progress: '48%', nextLesson: 'Functions and scope' },
  { course: 'Professional Communication', progress: '90%', nextLesson: 'Final assessment' },
]

/** Renders either the login form or the authenticated Home page. */
function App() {
  // Stores the values currently typed into the login form.
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Controls interface feedback and the currently signed-in Firebase user.
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signedInUser, setSignedInUser] = useState(null)

  // Identifies whether the shared form is creating an account or signing one in.
  const isRegistration = authMode === 'register'

  /** Returns a username validation message, or an empty string when valid. */
  function validateUsername(value) {
    if (!value.trim()) return 'Username is required.'
    if (value.trim().length < 2) return 'Username must contain at least 2 characters.'
    return ''
  }

  /** Returns an email validation message, or an empty string when valid. */
  function validateEmail(value) {
    if (!value.trim()) return 'Email address is required.'
    if (!emailPattern.test(value.trim())) return 'Enter a valid email address.'
    return ''
  }

  /** Returns a password validation message, or an empty string when present. */
  function validatePassword(value) {
    if (!value) return 'Password is required.'
    if (isRegistration && value.length < 6) {
      return 'Password must contain at least 6 characters.'
    }
    return ''
  }

  /** Converts Firebase errors into clear messages for the form. */
  function getAuthError(error) {
    if (error.code === 'auth/email-already-in-use') {
      return 'An account already exists with this email address.'
    }
    if (error.code === 'auth/weak-password') {
      return 'Password must contain at least 6 characters.'
    }
    return isRegistration
      ? 'Unable to create your account. Please try again.'
      : 'Unable to sign in with that email address and password.'
  }

  /** Validates the form, then signs in or creates a Firebase Authentication user. */
  async function handleSubmit(event) {
    event.preventDefault()

    // Stores the latest validation message for each input field.
    const nextErrors = {
      username: isRegistration ? validateUsername(username) : '',
      email: validateEmail(email),
      password: validatePassword(password),
    }

    setErrors(nextErrors)
    setAuthError('')

    if (nextErrors.username || nextErrors.email || nextErrors.password) return

    try {
      setIsSigningIn(true)
      // Applies memory-only persistence before beginning the Firebase sign-in.
      await authPersistenceReady
      const userCredential = isRegistration
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password)

      // Firebase Auth stores the requested username on the new user's profile.
      if (isRegistration) {
        await updateProfile(userCredential.user, { displayName: username.trim() })
      }

      // The form copies are no longer needed after Firebase has authenticated the user.
      setUsername('')
      setEmail('')
      setSignedInUser(userCredential.user)
    } catch (error) {
      setAuthError(getAuthError(error))
    } finally {
      // Removes the password from React memory after every attempt, including failures.
      setPassword('')
      setIsSigningIn(false)
    }
  }

  /** Updates the username field and refreshes any visible username error. */
  function handleUsernameChange(event) {
    const value = event.target.value
    setUsername(value)
    setAuthError('')
    if (errors.username) {
      setErrors((current) => ({ ...current, username: validateUsername(value) }))
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

  /** Switches between Login and Registration and clears form feedback. */
  function toggleAuthMode() {
    setAuthMode((mode) => (mode === 'login' ? 'register' : 'login'))
    setUsername('')
    setEmail('')
    setPassword('')
    setErrors({})
    setAuthError('')
  }

  /** Ends the Firebase session and returns the learner to the Login screen. */
  async function handleSignOut() {
    await signOut(auth)
    setSignedInUser(null)
    setAuthMode('login')
    setUsername('')
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
        <h1 id="login-heading">{isRegistration ? 'Create an account' : 'Welcome back'}</h1>
        <p className="intro">
          {isRegistration
            ? 'Start your learning journey with a new account.'
            : 'Sign in to continue your learning journey.'}
        </p>

        {/* Autocomplete is disabled so the app does not request browser autofill storage. */}
        <form autoComplete="off" noValidate onSubmit={handleSubmit}>
          {isRegistration && (
            <div className="field-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => setErrors((current) => ({ ...current, username: validateUsername(username) }))}
                autoComplete="off"
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'username-error' : undefined}
                placeholder="Choose a username"
              />
              {errors.username && <p id="username-error" className="error">{errors.username}</p>}
            </div>
          )}

          <div className="field-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => setErrors((current) => ({ ...current, email: validateEmail(email) }))}
              autoComplete="off"
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
                autoComplete="off"
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
            {isSigningIn
              ? isRegistration ? 'Creating account...' : 'Signing in...'
              : isRegistration ? 'Create account' : 'Sign in'}
          </button>
          {authError && <p className="error" role="alert">{authError}</p>}
          <p className="auth-switch">
            {isRegistration ? 'Already have an account?' : 'New to the portal?'}{' '}
            <button className="auth-switch-button" type="button" onClick={toggleAuthMode}>
              {isRegistration ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}

/** Displays the signed-in user menu and temporary learner dashboard data. */
function HomePage({ user, onSignOut }) {
  // Uses the username saved to the Firebase profile during registration.
  const userName = user.displayName

  return (
    <main className="home-page">
      <div className="home-layout">
        <aside className="user-sidebar" aria-label="Signed-in user menu">
          <div>
            <div className="brand-mark sidebar-brand" aria-hidden="true">LP</div>
            <p className="sidebar-label">Signed in as</p>
            <strong className="sidebar-name">{userName}</strong>
          </div>
          <button className="sign-out-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </aside>

        <section className="dashboard-content" aria-labelledby="dashboard-heading">
          <header className="dashboard-heading">
            <p className="eyebrow">Learner Portal</p>
            <h1 id="dashboard-heading">Learning overview</h1>
          </header>

          <div className="summary-grid" aria-label="Learning summary">
            {/* Creates one summary card for each temporary learning metric. */}
            {learningSummary.map((item) => (
              <article className="summary-card" key={item.label}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <section className="dashboard-card" aria-labelledby="courses-heading">
            <h2 id="courses-heading">Current learning</h2>
            <div className="learning-table" role="table" aria-label="Current courses">
              <div className="learning-row learning-header" role="row">
                <span role="columnheader">Course</span>
                <span role="columnheader">Progress</span>
                <span role="columnheader">Next lesson</span>
              </div>
              {/* Creates one table row for each temporary course record. */}
              {courseRows.map((row) => (
                <div className="learning-row" role="row" key={row.course}>
                  <span role="cell" data-label="Course">{row.course}</span>
                  <span role="cell" data-label="Progress">{row.progress}</span>
                  <span role="cell" data-label="Next lesson">{row.nextLesson}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
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
