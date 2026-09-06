import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatProgressTimestamp, getLearnerProgressError } from '../shared/portal.logic'
import './LearnerProgress.css'

export function LearnerProgress() {
  // This collection intentionally contains only username and progress totals, never an email address or private lesson data.
  const [learnerSummaries, setLearnerSummaries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [progressError, setProgressError] = useState('')

  useEffect(() => {
    // A simple newest-first query needs only Firestore's automatic single-field updatedAt index.
    const progressQuery = query(collection(db, 'learnerProgress'), orderBy('updatedAt', 'desc'))
    const unsubscribe = onSnapshot(
      progressQuery,
      (snapshot) => {
        setLearnerSummaries(snapshot.docs.map((learnerSnapshot) => ({
          id: learnerSnapshot.id,
          ...learnerSnapshot.data(),
        })))
        setProgressError('')
        setIsLoading(false)
      },
      (error) => {
        setProgressError(getLearnerProgressError(error))
        setIsLoading(false)
      },
    )

    // Closes the shared progress listener when the learner opens another portal screen.
    return unsubscribe
  }, [])

  return (
    <section className="dashboard-card learner-progress" aria-labelledby="learner-progress-heading">
      <div className="learner-progress-heading">
        <div>
          <h2 id="learner-progress-heading">Learner progress</h2>
          <p>Current course and lesson totals for signed-in learners. Permissions can be narrowed later with Custom Claims.</p>
        </div>
      </div>

      {progressError && <p className="error progress-status" role="alert">{progressError}</p>}

      <div className="learner-progress-list" aria-live="polite">
        {isLoading && <p className="empty-learning-content">Loading learner progress...</p>}
        {!isLoading && !progressError && learnerSummaries.length === 0 && (
          <p className="empty-learning-content">No learner progress is available yet. Each learner appears after their next sign-in.</p>
        )}
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

