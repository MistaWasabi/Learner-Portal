import { useEffect, useState } from 'react'
import {
  applyTheme,
  readThemePreference,
  removeThemePreference,
  resolveTheme,
  saveThemePreference,
} from './theme.logic'

/**
 * Owns the small amount of browser-side state required for the non-sensitive theme preference.
 * Keeping cookie reads and writes here means visual components only describe the controls they render.
 */
export function useThemePreference() {
  const [themePreference, setThemePreference] = useState(() => readThemePreference())
  const activeTheme = resolveTheme(themePreference)

  useEffect(() => {
    applyTheme(activeTheme)

    if (themePreference) {
      saveThemePreference(themePreference)
    } else {
      removeThemePreference()
    }
  }, [activeTheme, themePreference])

  /** Stores an explicit Light or Dark choice; validation stays inside the logic module. */
  function chooseTheme(theme) {
    setThemePreference(theme)
  }

  /** Deletes the preference rather than storing a third value, satisfying the cookie removal requirement. */
  function useDeviceTheme() {
    setThemePreference(null)
  }

  return { activeTheme, themePreference, chooseTheme, useDeviceTheme }
}
