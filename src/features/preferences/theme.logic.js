// The cookie name is deliberately specific to this portal and holds only a harmless visual choice.
const themePreferenceCookieName = 'learnerPortalTheme'

// Limiting accepted values prevents malformed cookie values from becoming CSS state.
const supportedThemes = new Set(['light', 'dark'])

// One year keeps a chosen appearance across browser sessions without treating it as account data.
const themePreferenceMaxAgeSeconds = 60 * 60 * 24 * 365

/** Returns true only for the two themes this user interface supports. */
export function isSupportedTheme(theme) {
  return supportedThemes.has(theme)
}

/**
 * Reads the optional visual preference from the browser cookie.
 * The function returns null for a missing or invalid value so the device preference can be used instead.
 */
export function readThemePreference() {
  if (typeof document === 'undefined') return null

  const cookieValue = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${themePreferenceCookieName}=`))
    ?.split('=')[1]

  return isSupportedTheme(cookieValue) ? cookieValue : null
}

/** Uses the device colour-scheme only when the learner has not explicitly selected Light or Dark. */
export function getDeviceTheme() {
  if (typeof window === 'undefined') return 'light'

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Resolves the active theme from a saved preference, with a safe device-based fallback. */
export function resolveTheme(themePreference) {
  return isSupportedTheme(themePreference) ? themePreference : getDeviceTheme()
}

/**
 * Applies the theme to the root HTML element so MasterStyles tokens update every feature at once.
 * This is presentation state only; no user, role, email, password, or Firebase credential is involved.
 */
export function applyTheme(theme) {
  const resolvedTheme = resolveTheme(theme)

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }

  return resolvedTheme
}

/** Saves the selected visual theme as a small, non-sensitive first-party cookie. */
export function saveThemePreference(theme) {
  if (!isSupportedTheme(theme)) {
    throw new Error('Choose either the light or dark theme.')
  }

  if (typeof document === 'undefined') return

  // Secure is added on HTTPS deployments while keeping localhost development functional.
  const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${themePreferenceCookieName}=${theme}; Path=/; Max-Age=${themePreferenceMaxAgeSeconds}; SameSite=Lax${secureAttribute}`
}

/** Removes the preference cookie so the portal returns to the learner's device setting. */
export function removeThemePreference() {
  if (typeof document === 'undefined') return

  const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${themePreferenceCookieName}=; Path=/; Max-Age=0; SameSite=Lax${secureAttribute}`
}

/**
 * Runs before React mounts to prevent a flash of the wrong colour theme on page refresh.
 * It has no React state because it only synchronises the already-known browser preference with the DOM.
 */
export function applyStoredTheme() {
  return applyTheme(readThemePreference())
}
