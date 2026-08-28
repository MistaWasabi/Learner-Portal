import { useState } from 'react'
import './App.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function validateEmail(value) {
    if (!value.trim()) return 'Email address is required.'
    if (!emailPattern.test(value.trim())) return 'Enter a valid email address.'
    return ''
  }

  function validatePassword(value) {
    if (!value) return 'Password is required.'
    return ''
  }

  function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }

    setErrors(nextErrors)
    setSubmitted(!nextErrors.email && !nextErrors.password)
  }

  function handleEmailChange(event) {
    const value = event.target.value
    setEmail(value)
    setSubmitted(false)
    if (errors.email) setErrors((current) => ({ ...current, email: validateEmail(value) }))
  }

  function handlePasswordChange(event) {
    const value = event.target.value
    setPassword(value)
    setSubmitted(false)
    if (errors.password) {
      setErrors((current) => ({ ...current, password: validatePassword(value) }))
    }
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

          <button className="submit-button" type="submit">Sign in</button>
          {submitted && (
            <p className="success" role="status">
              Your details are valid and ready to sign in.
            </p>
          )}
        </form>
      </section>
    </main>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  )
}

function HiddenEyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a17.7 17.7 0 0 1-3.1 3.7M6.2 6.2A17.8 17.8 0 0 0 2.5 12s3.4 6 9.5 6a10.7 10.7 0 0 0 3.1-.5" />
      <path d="M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4" />
    </svg>
  )
}

export default App
