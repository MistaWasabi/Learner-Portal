import { useNavigate } from 'react-router-dom'
import { canViewLearnerProgress } from '../auth/auth.logic'
import { ProgressSummary } from '../progress/ProgressSummary'
import { useHomeOverview } from './useHomeOverview'
import './HomeOverview.css'

/** Renders calculated Home totals and route shortcuts; data subscriptions live in useHomeOverview. */
export function HomeOverview({ user, role }) {
  const navigate = useNavigate()
  const { overview, overviewError } = useHomeOverview(user)
  const canViewProgress = canViewLearnerProgress(role)

  return (
    <div className="home-overview">
      {overviewError && <p className="error overview-status" role="alert">{overviewError}</p>}

      <section className="summary-grid" aria-label="Task summary">
        {/* The summary is calculated from the same protected records used by each feature. */}
        {overview.summaryItems.map((item) => (
          <article className="summary-card" key={item.label}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      {/* The summary card reuses Home's owner-scoped totals instead of reading another learner's progress data. */}
      <ProgressSummary user={user} overview={overview} />

      {/* These condensed cards use live feature totals, then send the learner to the focused screen for full controls. */}
      <section className="overview-quick-access" aria-label="Portal sections">
        <article className="overview-card">
          <p className="overview-label">Learning</p>
          <strong>{overview.selectedCourseCount} selected course{overview.selectedCourseCount === 1 ? '' : 's'}</strong>
          <p>Choose a course and explore its lessons at your own pace.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/learning')}>Open learning</button>
        </article>
        {/* Keep Home shortcuts aligned with the role-filtered sidebar; route and Firestore Rules provide the real enforcement. */}
        {canViewProgress && (
          <article className="overview-card">
            <p className="overview-label">Learner progress</p>
            <strong>{overview.completedLessonCount} lesson{overview.completedLessonCount === 1 ? '' : 's'} complete</strong>
            <p>View course completion totals for every learner in the portal.</p>
            <button className="overview-button" type="button" onClick={() => navigate('/progress')}>Open learner progress</button>
          </article>
        )}
        <article className="overview-card">
          <p className="overview-label">Task manager</p>
          <strong>{overview.completionRate}% complete</strong>
          <p>Manage all {overview.taskCount} learning task{overview.taskCount === 1 ? '' : 's'} in one place.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/tasks')}>Open task manager</button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Document library</p>
          <strong>{overview.documentCount} saved document{overview.documentCount === 1 ? '' : 's'}</strong>
          <p>Keep your uploaded learning documents organised and available to you.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/documents')}>Open document library</button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Support booking</p>
          <strong>{overview.supportBookingCount} request{overview.supportBookingCount === 1 ? '' : 's'}</strong>
          <p>Request learning support and track staff updates in one private place.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/support')}>Open support booking</button>
        </article>
      </section>
    </div>
  )
}
