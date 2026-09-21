import { useThemePreference } from './useThemePreference'
import './ThemePreference.css'

/**
 * Reusable Light/Dark control used by both authenticated and authentication screens.
 * It exposes only a cosmetic preference and never reads, stores, or displays sensitive account data.
 */
export function ThemePreference({ compact = false }) {
  const { activeTheme, themePreference, chooseTheme, useDeviceTheme } = useThemePreference()
  const className = `theme-preference ${compact ? 'theme-preference-compact' : ''}`

  return (
    <section className={className} aria-labelledby="theme-preference-heading">
      <p className="theme-preference-heading" id="theme-preference-heading">Appearance</p>
      <div className="theme-preference-options" aria-label="Colour theme" role="group">
        <button
          aria-pressed={activeTheme === 'light'}
          className={`theme-preference-option ${activeTheme === 'light' ? 'theme-preference-option-active' : ''}`}
          type="button"
          onClick={() => chooseTheme('light')}
        >
          Light
        </button>
        <button
          aria-pressed={activeTheme === 'dark'}
          className={`theme-preference-option ${activeTheme === 'dark' ? 'theme-preference-option-active' : ''}`}
          type="button"
          onClick={() => chooseTheme('dark')}
        >
          Dark
        </button>
      </div>
      {/* Removing the cookie lets the portal follow the browser/device colour preference again. */}
      {themePreference && (
        <button className="theme-preference-reset" type="button" onClick={useDeviceTheme}>
          Use device setting
        </button>
      )}
    </section>
  )
}
