import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { courseCatalog, createLessonProgressId, getLocalDateKey } from '../shared/portal.logic'
import { getOwnTasks, getTaskManagerError } from '../tasks/taskManager.logic'

const overviewLoadError = 'Your latest portal totals could not be loaded. Please try again.'

/** Connects Home to the existing owner-only data sources and returns one cleanup function for its listeners. */
export function subscribeToHomeOverview(user, { onTasks, onDocumentCount, onCourseIds, onLessonProgress, onSupportBookingCount, onError }) {
  let isCurrentUser = true

  // Tasks use the assessment-required Realtime Database REST GET; the other compact totals remain in Firestore.
  getOwnTasks(user)
    .then(({ tasks }) => {
      if (isCurrentUser) onTasks(tasks)
    })
    .catch((error) => {
      if (isCurrentUser) onError(getTaskManagerError(error, 'load'))
    })

  const documentUnsubscribe = onSnapshot(
    collection(db, 'users', user.uid, 'documents'),
    (snapshot) => onDocumentCount(snapshot.size),
    () => onError(overviewLoadError),
  )
  const courseUnsubscribe = onSnapshot(
    collection(db, 'users', user.uid, 'courseSelections'),
    (snapshot) => onCourseIds(snapshot.docs.map((courseSnapshot) => courseSnapshot.data().courseId)),
    () => onError(overviewLoadError),
  )
  const lessonUnsubscribe = onSnapshot(
    collection(db, 'users', user.uid, 'lessonProgress'),
    (snapshot) => onLessonProgress(snapshot.docs.map((progressSnapshot) => progressSnapshot.data())),
    () => onError(overviewLoadError),
  )
  // The owner filter matches Support Booking Rules and keeps Home limited to the signed-in learner's request count.
  const supportBookingsUnsubscribe = onSnapshot(
    query(collection(db, 'supportBookings'), where('ownerUid', '==', user.uid)),
    (snapshot) => onSupportBookingCount(snapshot.size),
    () => onError(overviewLoadError),
  )

  return () => {
    isCurrentUser = false
    documentUnsubscribe()
    courseUnsubscribe()
    lessonUnsubscribe()
    supportBookingsUnsubscribe()
  }
}

/** Calculates display-only Home totals from owner-scoped database data without storing duplicate summary records. */
export function createHomeOverview({ tasks, selectedCourseIds, lessonProgress, documentCount, supportBookingCount }) {
  const completedTaskCount = tasks.filter((task) => task.completed).length
  const outstandingTaskCount = tasks.length - completedTaskCount
  const overdueTaskCount = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < getLocalDateKey()).length
  const completionRate = tasks.length ? Math.round((completedTaskCount / tasks.length) * 100) : 0
  const selectedLessonIds = courseCatalog
    .filter((course) => selectedCourseIds.includes(course.id))
    .flatMap((course) => course.lessons.map((lesson) => createLessonProgressId(course.id, lesson.id)))
  const completedLessonCount = lessonProgress
    .filter((progress) => selectedLessonIds.includes(createLessonProgressId(progress.courseId, progress.lessonId))).length

  return {
    selectedCourseCount: selectedCourseIds.length,
    completedLessonCount,
    taskCount: tasks.length,
    completionRate,
    documentCount,
    supportBookingCount,
    summaryItems: [
      { label: 'Courses selected', value: selectedCourseIds.length },
      { label: 'Lessons complete', value: completedLessonCount },
      { label: 'Total tasks', value: tasks.length },
      { label: 'Completed', value: completedTaskCount },
      { label: 'Outstanding', value: outstandingTaskCount },
      { label: 'Overdue', value: overdueTaskCount },
      { label: 'Support requests', value: supportBookingCount },
    ],
  }
}
