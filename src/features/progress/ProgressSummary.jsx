import { useProgressSummary } from './useProgressSummary'
import './ProgressSummary.css'

/**
 * Gives every authenticated learner an export of their own Home totals.
 * It receives existing owner-scoped data from Home instead of creating a second Firebase subscription.
 */
export function ProgressSummary({ user, overview }) {
  const { downloadError, downloadStatus, handleDownload } = useProgressSummary(user, overview)

  return (
    <section className="progress-summary dashboard-card" aria-labelledby="progress-summary-heading">
      <div>
        <p className="progress-summary-label">Your progress</p>
        <h2 id="progress-summary-heading">Download progress summary</h2>
        <p className="progress-summary-description">Create a plain-text record of your current learning, task, document, and support totals.</p>
      </div>
      <div className="progress-summary-actions">
        <button className="progress-summary-download" type="button" onClick={handleDownload}>
          Download summary (.txt)
        </button>
        {/* Status messages confirm the local export without placing private details into the page. */}
        {downloadStatus && <p className="success progress-summary-status" role="status">{downloadStatus}</p>}
        {downloadError && <p className="error progress-summary-status" role="alert">{downloadError}</p>}
      </div>
    </section>
  )
}
