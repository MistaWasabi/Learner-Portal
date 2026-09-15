import { Link, useNavigate } from 'react-router-dom'
import { AuthPage } from './AuthPage'
import { PasswordField } from './PasswordField'
import { useAuthForm } from './useAuthForm'
import './Registration.css'

/**
 * Displays only the Registration journey at /register.
 * It collects the learner's non-sensitive username alongside credentials managed by Firebase Authentication.
 */
export function Registration({ onAuthenticated }) {
  const navigate = useNavigate()
  const {
    username,
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
  } = useAuthForm({ authMode: 'register', onAuthenticated, navigate })

  return (
    <AuthPage
      heading="Create an account"
      intro="Start your learning journey with a new account."
    >
      {/* Autocomplete is disabled so Registration does not ask the browser to retain credential form values. */}
      <form className="registration-form" autoComplete="off" noValidate onSubmit={handleSubmit}>
        <div className="registration-field-group">
          <label className="registration-label" htmlFor="registration-username">Username</label>
          <input
            id="registration-username"
            name="username"
            className="registration-input"
            type="text"
            value={username}
            onChange={(event) => changeField('username', event.target.value)}
            onBlur={() => validateField('username', username)}
            autoComplete="off"
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? 'registration-username-error' : undefined}
            placeholder="Choose a username"
          />
          {errors.username && <p id="registration-username-error" className="registration-error">{errors.username}</p>}
        </div>

        <div className="registration-field-group">
          <label className="registration-label" htmlFor="registration-email">Email address</label>
          <input
            id="registration-email"
            name="email"
            className="registration-input"
            type="email"
            value={email}
            onChange={(event) => changeField('email', event.target.value)}
            onBlur={() => validateField('email', email)}
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'registration-email-error' : undefined}
            placeholder="you@example.com"
          />
          {errors.email && <p id="registration-email-error" className="registration-error">{errors.email}</p>}
        </div>

        <div className="registration-field-group">
          <label className="registration-label" htmlFor="registration-password">Password</label>
          <PasswordField
            id="registration-password"
            value={password}
            showPassword={showPassword}
            error={errors.password}
            onChange={(event) => changeField('password', event.target.value)}
            onBlur={() => validateField('password', password)}
            onToggleVisibility={togglePasswordVisibility}
          />
          {errors.password && <p id="registration-password-error" className="registration-error">{errors.password}</p>}
        </div>

        <button className="registration-submit-button" type="submit" disabled={isSigningIn}>
          {isSigningIn ? 'Creating account...' : 'Create account'}
        </button>
        {authError && <p className="registration-error" role="alert">{authError}</p>}
        <p className="registration-route-prompt">
          Already have an account? <Link className="registration-route-link" to="/login">Sign in</Link>
        </p>
      </form>
    </AuthPage>
  )
}
