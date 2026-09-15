import './AuthPage.css'

/**
 * Provides the shared visual frame for authentication routes.
 * Login and Registration supply their own form content, so this component does not decide
 * which journey a learner is taking or perform any Firebase work.
 */
export function AuthPage({ heading, intro, children }) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-page-heading">
        <div className="auth-brand-mark" aria-hidden="true">LP</div>
        <p className="auth-eyebrow">Learner Portal</p>
        <h1 id="auth-page-heading" className="auth-heading">{heading}</h1>
        <p className="auth-intro">{intro}</p>
        {children}
      </section>
    </main>
  )
}
