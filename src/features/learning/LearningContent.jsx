import { useLearningContent } from './useLearningContent'
import './LearningContent.css'

/** Renders course and lesson controls; the hook owns subscriptions, batches, validation feedback, and state. */
export function LearningContent({ user }) {
  const {
    courseCatalog,
    selectedCourseIds,
    completedLessonIds,
    activeCourse,
    activeCompletedLessonCount,
    activeCourseProgress,
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
  } = useLearningContent(user)

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
                      <button className="course-view-button" type="button" onClick={() => setActiveCourseId(course.id)}>View lessons</button>
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
        {!isLoading && !learningError && !activeCourse && <p className="empty-learning-content">Select a course above to begin exploring its lessons.</p>}
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
              {activeCourse.lessons.map((lesson, index) => {
                const lessonProgressId = createLessonProgressId(activeCourse.id, lesson.id)
                const isCompleted = completedLessonIds.includes(lessonProgressId)

                return (
                  <li className="lesson-item" key={lesson.id}>
                    <span className="lesson-number" aria-hidden="true">{index + 1}</span>
                    <div>
                      <h4>{lesson.title}</h4>
                      <p>{lesson.summary}</p>
                    </div>
                    <div className="lesson-actions">
                      <span className="lesson-duration">{lesson.duration}</span>
                      <button
                        className={`lesson-completion-button ${isCompleted ? 'lesson-completion-button-complete' : ''}`}
                        type="button"
                        onClick={() => handleLessonCompletion(activeCourse, lesson)}
                        disabled={isSavingLessonId === lessonProgressId}
                        aria-pressed={isCompleted}
                      >
                        {isSavingLessonId === lessonProgressId ? 'Saving...' : isCompleted ? 'Completed' : 'Mark complete'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </section>
    </div>
  )
}
