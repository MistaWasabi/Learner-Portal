import { Link, useNavigate } from 'react-router-dom'
import { AuthPage } from './AuthPage'
import { PasswordField } from './PasswordField'
import { useAuthForm } from './useAuthForm'
import './Login.css'

/**
 * Displays only the Login journey at /login.
 * Authentication state, validation, and Firebase work stay in useAuthForm and authForm.logic.
 */
export function Login({ onAuthenticated }) {
  const navigate = useNavigate()
  const {
    email,
    password,
    showPassword,
    errors,
    authError,
    isSigningIn,
    changeField,
    validateField,
    handleSubmit,
    togglePasswordVisibility,
  } = useAuthForm({ authMode: 'login', onAuthenticated, navigate })

  return (
    <AuthPage
      heading="Welcome back"
      intro="Sign in to continue your learning journey."
    >
      {/* Autocomplete is disabled so Login does not request that the browser retain sensitive form values. */}
      <form className="login-form" autoComplete="off" noValidate onSubmit={handleSubmit}>
        <div className="login-field-group">
          <label className="login-label" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            className="login-input"
            type="email"
            value={email}
            onChange={(event) => changeField('email', event.target.value)}
            onBlur={() => validateField('email', email)}
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            placeholder="you@example.com"
          />
          {errors.email && <p id="login-email-error" className="login-error">{errors.email}</p>}
        </div>

        <div className="login-field-group">
          <label className="login-label" htmlFor="login-password">Password</label>
          <PasswordField
            id="login-password"
            value={password}
            showPassword={showPassword}
            error={errors.password}
            onChange={(event) => changeField('password', event.target.value)}
            onBlur={() => validateField('password', password)}
            onToggleVisibility={togglePasswordVisibility}
          />
          {errors.password && <p id="login-password-error" className="login-error">{errors.password}</p>}
        </div>

        <button className="login-submit-button" type="submit" disabled={isSigningIn}>
          {isSigningIn ? 'Signing in...' : 'Sign in'}
        </button>
        {authError && <p className="login-error" role="alert">{authError}</p>}
        <p className="login-route-prompt">
          New to the portal? <Link className="login-route-link" to="/register">Create an account</Link>
        </p>
      </form>
    </AuthPage>
  )
}
