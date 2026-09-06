import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { courseCatalog, createLearnerProgressSummary, createLessonProgressId, getLearningContentError } from '../shared/portal.logic'
import './LearningContent.css'

export function LearningContent({ user }) {
  // Firestore contains only this learner's selections; the shared lesson text remains read-only application content.
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [completedLessonIds, setCompletedLessonIds] = useState([])
  const [activeCourseId, setActiveCourseId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingCourseId, setIsSavingCourseId] = useState('')
  const [isSavingLessonId, setIsSavingLessonId] = useState('')
  const [learningError, setLearningError] = useState('')
  const [learningSuccess, setLearningSuccess] = useState('')

  useEffect(() => {
    const selectionsReference = collection(db, 'users', user.uid, 'courseSelections')

    const lessonProgressReference = collection(db, 'users', user.uid, 'lessonProgress')

    // Live listeners keep course selections and lesson completions consistent between open portal tabs.
    const selectionsUnsubscribe = onSnapshot(
      selectionsReference,
      (snapshot) => {
        const validCourseIds = snapshot.docs
          .map((courseSnapshot) => courseSnapshot.data().courseId)
          .filter((courseId) => courseCatalog.some((course) => course.id === courseId))
        setSelectedCourseIds(validCourseIds)
        setLearningError('')
        setIsLoading(false)
      },
      (error) => {
        setLearningError(getLearningContentError(error, 'load'))
        setIsLoading(false)
      },
    )
    const lessonProgressUnsubscribe = onSnapshot(
      lessonProgressReference,
      (snapshot) => setCompletedLessonIds(snapshot.docs.map((progressSnapshot) => progressSnapshot.id)),
      (error) => setLearningError(getLearningContentError(error, 'load')),
    )

    // Removes both real-time connections when this focused screen is no longer shown.
    return () => {
      selectionsUnsubscribe()
      lessonProgressUnsubscribe()
    }
  }, [user.uid])

  // Deriving the fallback avoids a second state update when a course selection changes in Firestore.
  const activeCourse = courseCatalog.find((course) => course.id === activeCourseId && selectedCourseIds.includes(course.id))
    ?? courseCatalog.find((course) => selectedCourseIds.includes(course.id))
  const activeCompletedLessonCount = activeCourse
    ? activeCourse.lessons.filter((lesson) => completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id))).length
    : 0
  const activeCourseProgress = activeCourse
    ? Math.round((activeCompletedLessonCount / activeCourse.lessons.length) * 100)
    : 0

  /** Adds one known course to the learner's private Firestore selection collection. */
  async function handleCourseSelect(course) {
    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingCourseId(course.id)
      const nextSelectedCourseIds = [...selectedCourseIds, course.id]
      const batch = writeBatch(db)

      // A predictable document ID prevents duplicate selections for the same course.
      batch.set(doc(db, 'users', user.uid, 'courseSelections', course.id), {
        courseId: course.id,
        enrolledAt: serverTimestamp(),
      })
      // Keeping the selection and its learner-facing total together prevents the shared view from showing stale data.
      batch.set(
        doc(db, 'learnerProgress', user.uid),
        createLearnerProgressSummary(user, nextSelectedCourseIds, completedLessonIds),
      )
      await batch.commit()
      setActiveCourseId(course.id)
      setLearningSuccess(`${course.title} was added to your learning.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'save'))
    } finally {
      setIsSavingCourseId('')
    }
  }

  /** Removes a course selection without changing the shared course content for anyone else. */
  async function handleCourseRemove(course) {
    const shouldRemove = window.confirm(`Remove “${course.title}” from your learning?`)

    if (!shouldRemove) return

    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingCourseId(course.id)
      const nextSelectedCourseIds = selectedCourseIds.filter((courseId) => courseId !== course.id)
      const batch = writeBatch(db)
      batch.delete(doc(db, 'users', user.uid, 'courseSelections', course.id))
      // Previous completions remain private so a learner can resume them if they re-select the course later.
      batch.set(
        doc(db, 'learnerProgress', user.uid),
        createLearnerProgressSummary(user, nextSelectedCourseIds, completedLessonIds),
      )
      await batch.commit()
      setLearningSuccess(`${course.title} was removed from your learning.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'delete'))
    } finally {
      setIsSavingCourseId('')
    }
  }

  /** Marks one selected lesson complete or incomplete and updates the shared total in the same batch. */
  async function handleLessonCompletion(course, lesson) {
    const lessonProgressId = createLessonProgressId(course.id, lesson.id)
    const isCompleted = completedLessonIds.includes(lessonProgressId)
    const nextCompletedLessonIds = isCompleted
      ? completedLessonIds.filter((completedLessonId) => completedLessonId !== lessonProgressId)
      : [...completedLessonIds, lessonProgressId]

    setLearningError('')
    setLearningSuccess('')

    try {
      setIsSavingLessonId(lessonProgressId)
      const batch = writeBatch(db)
      const lessonReference = doc(db, 'users', user.uid, 'lessonProgress', lessonProgressId)

      if (isCompleted) {
        // Deleting the record is simpler and safer than allowing lesson-completion updates.
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
      setLearningSuccess(isCompleted ? `${lesson.title} marked incomplete.` : `${lesson.title} marked complete.`)
    } catch (error) {
      setLearningError(getLearningContentError(error, 'progress'))
    } finally {
      setIsSavingLessonId('')
    }
  }

  return (
    <div className="learning-content">
      <section className="dashboard-card course-catalog" aria-labelledby="course-catalog-heading">
        <div className="learning-section-heading">
          <div>
            <h2 id="course-catalog-heading">Choose a course</h2>
            <p>Select the topics you want to include in your personal learning plan.</p>
          </div>
        </div>

        {learningError && <p className="error learning-status" role="alert">{learningError}</p>}
        {learningSuccess && <p className="success learning-status" role="status">{learningSuccess}</p>}

        <div className="course-grid" aria-live="polite">
          {courseCatalog.map((course) => {
            const isSelected = selectedCourseIds.includes(course.id)
            const isSaving = isSavingCourseId === course.id

            return (
              <article className={`course-card ${isSelected ? 'course-card-selected' : ''}`} key={course.id}>
                <div>
                  <p className="course-meta">{course.level} · {course.duration}</p>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                </div>
                <div className="course-card-actions">
                  {isSelected ? (
                    <>
                      <button className="course-view-button" type="button" onClick={() => setActiveCourseId(course.id)}>
                        View lessons
                      </button>
                      <button className="course-remove-button" type="button" onClick={() => handleCourseRemove(course)} disabled={isSaving}>
                        {isSaving ? 'Removing...' : 'Remove'}
                      </button>
                    </>
                  ) : (
                    <button className="course-select-button" type="button" onClick={() => handleCourseSelect(course)} disabled={isSaving || isLoading}>
                      {isSaving ? 'Adding...' : 'Add to my learning'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="dashboard-card lesson-content" aria-labelledby="lesson-content-heading">
        <div className="learning-section-heading">
          <div>
            <h2 id="lesson-content-heading">Course content</h2>
            <p>Open a selected course to see the lessons included in its learning path.</p>
          </div>
        </div>

        {isLoading && <p className="empty-learning-content">Loading your selected courses...</p>}
        {!isLoading && !learningError && !activeCourse && (
          <p className="empty-learning-content">Select a course above to begin exploring its lessons.</p>
        )}
        {activeCourse && (
          <div className="active-course-content">
            <div className="active-course-header">
              <div>
                <p className="course-meta">{activeCourse.level} · {activeCourse.duration}</p>
                <h3>{activeCourse.title}</h3>
                <p>{activeCourse.description}</p>
                <p className="course-progress-label">{activeCompletedLessonCount} of {activeCourse.lessons.length} lessons complete · {activeCourseProgress}%</p>
              </div>
              <button className="course-remove-button" type="button" onClick={() => handleCourseRemove(activeCourse)} disabled={isSavingCourseId === activeCourse.id}>
                {isSavingCourseId === activeCourse.id ? 'Removing...' : 'Remove course'}
              </button>
            </div>
            <ol className="lesson-list">
              {activeCourse.lessons.map((lesson, index) => (
                <li className="lesson-item" key={lesson.id}>
                  <span className="lesson-number" aria-hidden="true">{index + 1}</span>
                  <div>
                    <h4>{lesson.title}</h4>
                    <p>{lesson.summary}</p>
                  </div>
                  <div className="lesson-actions">
                    <span className="lesson-duration">{lesson.duration}</span>
                    <button
                      className={`lesson-completion-button ${completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id)) ? 'lesson-completion-button-complete' : ''}`}
                      type="button"
                      onClick={() => handleLessonCompletion(activeCourse, lesson)}
                      disabled={isSavingLessonId === createLessonProgressId(activeCourse.id, lesson.id)}
                      aria-pressed={completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id))}
                    >
                      {isSavingLessonId === createLessonProgressId(activeCourse.id, lesson.id)
                        ? 'Saving...'
                        : completedLessonIds.includes(createLessonProgressId(activeCourse.id, lesson.id)) ? 'Completed' : 'Mark complete'}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  )
}

