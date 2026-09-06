import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { courseCatalog, createLessonProgressId, getLocalDateKey } from '../shared/portal.logic'
import { getOwnTasks, getTaskManagerError } from '../tasks/taskManager.logic'
import './HomeOverview.css'

export function HomeOverview({ user }) {
  // Routing replaces the previous local screen state, so Home shortcuts now have shareable URLs.
  const navigate = useNavigate()
  // Stores only the small amount of learner-owned data required for the dashboard totals.
  const [tasks, setTasks] = useState([])
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [lessonProgress, setLessonProgress] = useState([])
  const [documentCount, setDocumentCount] = useState(0)
  const [overviewError, setOverviewError] = useState('')

  useEffect(() => {
    let isCurrentUser = true

    // Tasks now come from Realtime Database through the assessment-required REST GET,
    // while documents, courses, and lesson progress remain in their existing Firestore collections.
    // The flag prevents a late REST response from a previous account replacing the next learner's totals.
    getOwnTasks(user)
      .then(({ tasks: loadedTasks }) => {
        if (isCurrentUser) setTasks(loadedTasks)
      })
      .catch((error) => {
        if (isCurrentUser) setOverviewError(getTaskManagerError(error, 'load'))
      })

    // These paths match the owner-only Firestore rules, so the overview never reads another learner's data.
    const documentUnsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'documents'),
      (snapshot) => setDocumentCount(snapshot.size),
      () => setOverviewError('Your latest portal totals could not be loaded. Please try again.'),
    )
    const courseUnsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'courseSelections'),
      (snapshot) => setSelectedCourseIds(snapshot.docs.map((courseSnapshot) => courseSnapshot.data().courseId)),
      () => setOverviewError('Your latest portal totals could not be loaded. Please try again.'),
    )
    const lessonProgressUnsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'lessonProgress'),
      (snapshot) => setLessonProgress(snapshot.docs.map((progressSnapshot) => progressSnapshot.data())),
      () => setOverviewError('Your latest portal totals could not be loaded. Please try again.'),
    )

    // Stops all real-time listeners when the learner leaves Home or signs out.
    return () => {
      isCurrentUser = false
      documentUnsubscribe()
      courseUnsubscribe()
      lessonProgressUnsubscribe()
    }
  }, [user])

  const completedTaskCount = tasks.filter((task) => task.completed).length
  const outstandingTaskCount = tasks.length - completedTaskCount
  // Comparing ISO-style date strings makes the overdue total reliable without storing a browser-specific date object.
  const overdueTaskCount = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < getLocalDateKey()).length
  const completionRate = tasks.length ? Math.round((completedTaskCount / tasks.length) * 100) : 0
  const selectedLessonIds = courseCatalog
    .filter((course) => selectedCourseIds.includes(course.id))
    .flatMap((course) => course.lessons.map((lesson) => createLessonProgressId(course.id, lesson.id)))
  const completedLessonCount = lessonProgress.filter((progress) => selectedLessonIds.includes(createLessonProgressId(progress.courseId, progress.lessonId))).length

  const summaryItems = [
    { label: 'Courses selected', value: selectedCourseIds.length },
    { label: 'Lessons complete', value: completedLessonCount },
    { label: 'Total tasks', value: tasks.length },
    { label: 'Completed', value: completedTaskCount },
    { label: 'Outstanding', value: outstandingTaskCount },
    { label: 'Overdue', value: overdueTaskCount },
  ]

  return (
    <div className="home-overview">
      {overviewError && <p className="error overview-status" role="alert">{overviewError}</p>}

      <section className="summary-grid" aria-label="Task summary">
        {/* The Home screen calculates live totals from the same REST-loaded task records as Task Manager. */}
        {summaryItems.map((item) => (
          <article className="summary-card" key={item.label}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="overview-quick-access" aria-label="Portal sections">
        <article className="overview-card">
          <p className="overview-label">Learning</p>
          <strong>{selectedCourseIds.length} selected course{selectedCourseIds.length === 1 ? '' : 's'}</strong>
          <p>Choose a course and explore its lessons at your own pace.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/learning')}>
            Open learning
          </button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Learner progress</p>
          <strong>{completedLessonCount} lesson{completedLessonCount === 1 ? '' : 's'} complete</strong>
          <p>View course completion totals for every learner in the portal.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/progress')}>
            Open learner progress
          </button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Task manager</p>
          <strong>{completionRate}% complete</strong>
          <p>Manage all {tasks.length} learning task{tasks.length === 1 ? '' : 's'} in one place.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/tasks')}>
            Open task manager
          </button>
        </article>
        <article className="overview-card">
          <p className="overview-label">Document library</p>
          <strong>{documentCount} saved link{documentCount === 1 ? '' : 's'}</strong>
          <p>Keep your learning-document links organised and available to you.</p>
          <button className="overview-button" type="button" onClick={() => navigate('/documents')}>
            Open document library
          </button>
        </article>
      </section>
    </div>
  )
}
