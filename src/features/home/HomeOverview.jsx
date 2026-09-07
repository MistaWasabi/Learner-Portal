import { useNavigate } from 'react-router-dom'
import { useHomeOverview } from './useHomeOverview'
import './HomeOverview.css'

/** Renders calculated Home totals and route shortcuts; data subscriptions live in useHomeOverview. */
export function HomeOverview({ user }) {
  const navigate = useNavigate()
  const { overview, overviewError } = useHomeOverview(user)

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

      <section className="overview-quick-access" aria-label="Portal sections">
        <article className="overview-card">
          <p className="overview-label">Learning</p>
          <strong>{overview.selectedCourseCount} selected course{overview.selectedCourseCount === 1 ? '' : 's'}</strong>
          <p>Choose a course and explore its lessons at your own pace.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/learning')}>Open learning</button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Learner progress</p>
          <strong>{overview.completedLessonCount} lesson{overview.completedLessonCount === 1 ? '' : 's'} complete</strong>
          <p>View course completion totals for every learner in the portal.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/progress')}>Open learner progress</button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Task manager</p>
          <strong>{overview.completionRate}% complete</strong>
          <p>Manage all {overview.taskCount} learning task{overview.taskCount === 1 ? '' : 's'} in one place.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/tasks')}>Open task manager</button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Document library</p>
          <strong>{overview.documentCount} saved link{overview.documentCount === 1 ? '' : 's'}</strong>
          <p>Keep your learning-document links organised and available to you.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/documents')}>Open document library</button>
        </article>
      </section>
    </div>
  )
}
