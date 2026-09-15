import './PasswordField.css'

/**
 * Renders the password input shared by Login and Registration.
 * It receives the value and event handlers from useAuthForm, keeping password state out of this visual component.
 */
export function PasswordField({
  id,
  value,
  showPassword,
  error,
  onChange,
  onBlur,
  onToggleVisibility,
}) {
  const errorId = `${id}-error`

  return (
    <div className="auth-password-field">
      <input
        id={id}
        name="password"
        className="auth-password-input"
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        // The application never asks the browser to remember a password.
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        placeholder="Enter your password"
      />
      <button
        className="auth-password-toggle"
        type="button"
        onClick={onToggleVisibility}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
      >
        {showPassword ? <HiddenEyeIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

/** Displays the eye icon when the password remains masked. */
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  )
}

/** Displays the crossed-out eye icon after the learner makes the password visible. */
function HiddenEyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a17.7 17.7 0 0 1-3.1 3.7M6.2 6.2A17.8 17.8 0 0 0 2.5 12s3.4 6 9.5 6a10.7 10.7 0 0 0 3.1-.5" />
      <path d="M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4" />
    </svg>
  )
}
