import { collection, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { courseCatalog, createLearnerProgressSummary, createLessonProgressId } from '../shared/portal.logic'

/** Opens the learner's private selection and completion listeners, returning one function that closes both. */
export function subscribeToLearningData(user, { onSelectedCourseIds, onCompletedLessonIds, onError }) {
  const selectionsUnsubscribe = onSnapshot(
    collection(db, 'users', user.uid, 'courseSelections'),
    (snapshot) => {
      const validCourseIds = snapshot.docs
        .map((courseSnapshot) => courseSnapshot.data().courseId)
        .filter((courseId) => courseCatalog.some((course) => course.id === courseId))
      onSelectedCourseIds(validCourseIds)
    },
    onError,
  )
  const lessonProgressUnsubscribe = onSnapshot(
    collection(db, 'users', user.uid, 'lessonProgress'),
    (snapshot) => onCompletedLessonIds(snapshot.docs.map((progressSnapshot) => progressSnapshot.id)),
    onError,
  )

  return () => {
    selectionsUnsubscribe()
    lessonProgressUnsubscribe()
  }
}

/** Uses one Firestore batch so a learner's selected course and public progress total never disagree. */
export async function addCourseSelection(user, course, selectedCourseIds, completedLessonIds) {
  const nextSelectedCourseIds = [...selectedCourseIds, course.id]
  const batch = writeBatch(db)

  batch.set(doc(db, 'users', user.uid, 'courseSelections', course.id), {
    courseId: course.id,
    enrolledAt: serverTimestamp(),
  })
  batch.set(
    doc(db, 'learnerProgress', user.uid),
    createLearnerProgressSummary(user, nextSelectedCourseIds, completedLessonIds),
  )
  await batch.commit()
}

/** Removes a selection and refreshes the shared total while retaining private lesson completions for later re-enrolment. */
export async function removeCourseSelection(user, course, selectedCourseIds, completedLessonIds) {
  const nextSelectedCourseIds = selectedCourseIds.filter((courseId) => courseId !== course.id)
  const batch = writeBatch(db)

  batch.delete(doc(db, 'users', user.uid, 'courseSelections', course.id))
  batch.set(
    doc(db, 'learnerProgress', user.uid),
    createLearnerProgressSummary(user, nextSelectedCourseIds, completedLessonIds),
  )
  await batch.commit()
}

/** Toggles exactly one known lesson record and updates the learner-progress summary in the same batch. */
export async function toggleLessonProgress(user, course, lesson, selectedCourseIds, completedLessonIds) {
  const lessonProgressId = createLessonProgressId(course.id, lesson.id)
  const isCompleted = completedLessonIds.includes(lessonProgressId)
  const nextCompletedLessonIds = isCompleted
    ? completedLessonIds.filter((completedLessonId) => completedLessonId !== lessonProgressId)
    : [...completedLessonIds, lessonProgressId]
  const batch = writeBatch(db)
  const lessonReference = doc(db, 'users', user.uid, 'lessonProgress', lessonProgressId)

  if (isCompleted) {
    // Deletion preserves the immutable completion-date rule instead of permitting arbitrary updates.
    batch.delete(lessonReference)
  } else {
    batch.set(lessonReference, {
      courseId: course.id,
      lessonId: lesson.id,
      completedAt: serverTimestamp(),
    })
  }

  batch.set(
    doc(db, 'learnerProgress', user.uid),
    createLearnerProgressSummary(user, selectedCourseIds, nextCompletedLessonIds),
  )
  await batch.commit()

  return { lessonProgressId, isCompleted }
}

/** Finds the chosen active course, falling back to the first current selection after a real-time change. */
export function getActiveCourse(activeCourseId, selectedCourseIds) {
  return courseCatalog.find((course) => course.id === activeCourseId && selectedCourseIds.includes(course.id))
    ?? courseCatalog.find((course) => selectedCourseIds.includes(course.id))
}

/** Calculates the active course's current lesson total without storing a duplicate number in Firestore. */
export function getActiveCourseProgress(activeCourse, completedLessonIds) {
  if (!activeCourse) return { completedLessonCount: 0, progressPercentage: 0 }

  const completedLessonCount = activeCourse.lessons
    .filter((lesson) => completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id))).length

  return {
    completedLessonCount,
    progressPercentage: Math.round((completedLessonCount / activeCourse.lessons.length) * 100),
  }
}
