import { formatProgressTimestamp } from '../shared/portal.logic'
import { useLearnerProgress } from './useLearnerProgress'
import './LearnerProgress.css'

/** Renders Staff-authorised learner totals; Firestore listening remains in the dedicated hook. */
export function LearnerProgress() {
  const { learnerSummaries, isLoading, progressError } = useLearnerProgress()

  return (
    <section className="dashboard-card learner-progress" aria-labelledby="learner-progress-heading">
      <div className="learner-progress-heading">
        <div>
          <h2 id="learner-progress-heading">Learner progress</h2>
          <p>Current course and lesson totals for signed-in learners. Access is limited to Admin and Teacher Custom Claims.</p>
        </div>
      </div>

      {progressError && <p className="error progress-status" role="alert">{progressError}</p>}

      <div className="learner-progress-list" aria-live="polite">
        {isLoading && <p className="empty-learning-content">Loading learner progress...</p>}
        {!isLoading && !progressError && learnerSummaries.length === 0 && <p className="empty-learning-content">No learner progress is available yet. Each learner appears after their next sign-in.</p>}
        {learnerSummaries.map((summary) => {
          const progressPercent = summary.totalSelectedLessons
            ? Math.round((summary.completedLessonCount / summary.totalSelectedLessons) * 100)
            : 0

          return (
            <article className="learner-progress-item" key={summary.id}>
              <div>
                <h3>{summary.displayName}</h3>
                <p>{summary.selectedCourseCount} selected course{summary.selectedCourseCount === 1 ? '' : 's'} · {summary.completedLessonCount} of {summary.totalSelectedLessons} lessons complete</p>
                <p className="progress-last-updated">Updated {formatProgressTimestamp(summary.updatedAt)}</p>
              </div>
              <div className="progress-meter" aria-label={`${summary.displayName} has completed ${progressPercent}% of selected lessons`}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <strong>{progressPercent}%</strong>
            </article>
          )
        })}
      </div>
    </section>
  )
}
