import { useEffect, useMemo, useState } from 'react'
import { courseCatalog, createLessonProgressId, getLearningContentError } from '../shared/portal.logic'
import {
  addCourseSelection,
  getActiveCourse,
  getActiveCourseProgress,
  removeCourseSelection,
  subscribeToLearningData,
  toggleLessonProgress,
} from './learning.logic'

/** Holds learning-page state and delegates all Firestore data access to learning.logic.js. */
export function useLearningContent(user) {
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [completedLessonIds, setCompletedLessonIds] = useState([])
  const [activeCourseId, setActiveCourseId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingCourseId, setIsSavingCourseId] = useState('')
  const [isSavingLessonId, setIsSavingLessonId] = useState('')
  const [learningError, setLearningError] = useState('')
  const [learningSuccess, setLearningSuccess] = useState('')

  useEffect(() => subscribeToLearningData(user, {
    onSelectedCourseIds: (nextCourseIds) => {
      setSelectedCourseIds(nextCourseIds)
      setLearningError('')
      setIsLoading(false)
    },
    onCompletedLessonIds: setCompletedLessonIds,
    onError: (error) => {
      setLearningError(getLearningContentError(error, 'load'))
      setIsLoading(false)
    },
  }), [user])

  const activeCourse = useMemo(
    () => getActiveCourse(activeCourseId, selectedCourseIds),
    [activeCourseId, selectedCourseIds],
  )
  const activeCourseProgress = useMemo(
    () => getActiveCourseProgress(activeCourse, completedLessonIds),
    [activeCourse, completedLessonIds],
  )

  /** Adds a known course using the batch helper, then opens it for the learner. */
  async function handleCourseSelect(course) {
    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingCourseId(course.id)
      await addCourseSelection(user, course, selectedCourseIds, completedLessonIds)
      setActiveCourseId(course.id)
      setLearningSuccess(`${course.title} was added to your learning.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'save'))
    } finally {
      setIsSavingCourseId('')
    }
  }

  /** Confirms selection removal before delegating the private Firestore batch to the data module. */
  async function handleCourseRemove(course) {
    if (!window.confirm(`Remove “${course.title}” from your learning?`)) return

    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingCourseId(course.id)
      await removeCourseSelection(user, course, selectedCourseIds, completedLessonIds)
      setLearningSuccess(`${course.title} was removed from your learning.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'delete'))
    } finally {
      setIsSavingCourseId('')
    }
  }

  /** Toggles one lesson completion while preserving consistent shared progress totals. */
  async function handleLessonCompletion(course, lesson) {
    const lessonProgressId = createLessonProgressId(course.id, lesson.id)
    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingLessonId(lessonProgressId)
      const { isCompleted } = await toggleLessonProgress(user, course, lesson, selectedCourseIds, completedLessonIds)
      setLearningSuccess(isCompleted ? `${lesson.title} marked incomplete.` : `${lesson.title} marked complete.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'progress'))
    } finally {
      setIsSavingLessonId('')
    }
  }

  return {
    courseCatalog,
    selectedCourseIds,
    completedLessonIds,
    activeCourse,
    activeCompletedLessonCount: activeCourseProgress.completedLessonCount,
    activeCourseProgress: activeCourseProgress.progressPercentage,
    isLoading,
    isSavingCourseId,
    isSavingLessonId,
    learningError,
    learningSuccess,
    setActiveCourseId,
    handleCourseSelect,
    handleCourseRemove,
    handleLessonCompletion,
    createLessonProgressId,
  }
}
