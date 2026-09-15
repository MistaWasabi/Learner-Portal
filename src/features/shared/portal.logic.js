import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'

// Static course details belong in code for this first learner-facing version; Firestore stores selections only.
// Course content is kept in the application for this learner-facing first version.
// Firestore stores only which courses each learner has personally selected.
export const courseCatalog = [
  {
    id: 'web-development-basics',
    title: 'Web Development Basics',
    level: 'Beginner',
    duration: '3 hours',
    description: 'Understand how webpages are structured, styled, and delivered in a browser.',
    lessons: [
      { id: 'html-foundations', title: 'HTML foundations', duration: '35 min', summary: 'Build meaningful page structure with headings, paragraphs, links, and lists.' },
      { id: 'css-layouts', title: 'CSS layouts', duration: '45 min', summary: 'Use spacing, Flexbox, and Grid to arrange content clearly.' },
      { id: 'responsive-design', title: 'Responsive design', duration: '40 min', summary: 'Adapt a page so it works well on phones, tablets, and desktops.' },
    ],
  },
  {
    id: 'javascript-fundamentals',
    title: 'JavaScript Fundamentals',
    level: 'Beginner',
    duration: '4 hours',
    description: 'Learn the building blocks used to add behaviour and logic to a webpage.',
    lessons: [
      { id: 'variables-values', title: 'Variables and values', duration: '40 min', summary: 'Store and reuse information with clear variable names and data types.' },
      { id: 'conditions-loops', title: 'Conditions and loops', duration: '50 min', summary: 'Make decisions and repeat work with predictable program flow.' },
      { id: 'functions-events', title: 'Functions and events', duration: '50 min', summary: 'Organise reusable code and respond to learner actions in the browser.' },
    ],
  },
  {
    id: 'professional-communication',
    title: 'Professional Communication',
    level: 'Essential',
    duration: '2 hours',
    description: 'Practise clear written communication for teamwork, support, and professional learning.',
    lessons: [
      { id: 'clear-messages', title: 'Writing clear messages', duration: '30 min', summary: 'Structure short messages so their purpose and next step are easy to understand.' },
      { id: 'feedback', title: 'Giving useful feedback', duration: '35 min', summary: 'Give specific, respectful feedback that helps a teammate improve.' },
      { id: 'professional-email', title: 'Professional email', duration: '30 min', summary: 'Use subject lines, tone, and structure appropriate for a workplace email.' },
    ],
  },
]

// Fixed options match the values enforced by Realtime Database task rules.
export const taskCategories = ['General', 'JavaScript', 'Project', 'Support']
export const taskPriorities = ['low', 'medium', 'high']

// Creates fresh state whenever the task form is cleared after a save or cancelled edit.
export function createEmptyTask() {
  return {
    title: '',
    category: 'General',
    dueDate: '',
    priority: 'medium',
    completed: false,
  }
}

/** Creates a stable Firestore document ID for a learner's completion of one known lesson. */
export function createLessonProgressId(courseId, lessonId) {
  return `${courseId}--${lessonId}`
}

/** Keeps a public progress username short and avoids putting an email address in shared progress data. */
export function getLearnerDisplayName(user) {
  return user.displayName?.trim().slice(0, 50) || 'Learner'
}

/** Calculates small, non-sensitive totals that the shared learner-progress screen can display. */
export function createLearnerProgressSummary(user, selectedCourseIds, completedLessonIds) {
  const selectedCourses = courseCatalog.filter((course) => selectedCourseIds.includes(course.id))
  const selectedLessonIds = selectedCourses.flatMap((course) => (
    course.lessons.map((lesson) => createLessonProgressId(course.id, lesson.id))
  ))
  const completedLessonCount = selectedLessonIds.filter((lessonId) => completedLessonIds.includes(lessonId)).length

  return {
    displayName: getLearnerDisplayName(user),
    selectedCourseCount: selectedCourses.length,
    totalSelectedLessons: selectedLessonIds.length,
    completedLessonCount,
    updatedAt: serverTimestamp(),
  }
}

/** Ensures every learner who signs in gets a small shared progress-summary record. */
export async function ensureLearnerProgressSummary(user) {
  const progressReference = doc(db, 'learnerProgress', user.uid)
  const progressSnapshot = await getDoc(progressReference)

  if (!progressSnapshot.exists()) {
    // New records start at zero because existing course and lesson data is stored separately.
    await setDoc(progressReference, createLearnerProgressSummary(user, [], []))
    return
  }

  // A merge refreshes the display name without overwriting the learner's existing progress totals.
  await setDoc(progressReference, {
    displayName: getLearnerDisplayName(user),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/** Turns Firestore failures into messages a learner can act on. */
export function getDocumentLibraryError(error, action) {
  // Firestore and Storage use different error-code prefixes, but both mean the published Firebase Rules need checking.
  if (error.code === 'permission-denied' || error.code === 'storage/unauthorized') {
    return 'Firebase has blocked this document action. Check that the latest Firestore and Storage rules are published.'
  }
  return action === 'load'
    ? 'Your document library could not be loaded. Please try again.'
    : action === 'delete'
      ? 'Your document could not be deleted. Please try again.'
      : action === 'open'
        ? 'Your document could not be opened. Please try again.'
        : 'Your document could not be uploaded. Please try again.'
}

/** Returns learner-friendly course-selection feedback without exposing Firebase implementation details. */
export function getLearningContentError(error, action) {
  if (error.code === 'permission-denied') {
    return 'Firestore has blocked this action. Publish the latest Firestore rules and try again.'
  }
  if (action === 'load') return 'Your selected courses could not be loaded. Please try again.'
  if (action === 'delete') return 'Your course could not be removed. Please try again.'
  if (action === 'progress') return 'Your lesson progress could not be saved. Please try again.'
  return 'Your course could not be added. Please try again.'
}

/** Returns learner-friendly feedback for the separate shared progress screen. */
export function getLearnerProgressError(error) {
  if (error.code === 'permission-denied') {
    return 'Firestore has blocked learner progress. Publish the latest Firestore rules and try again.'
  }
  return 'Learner progress could not be loaded. Please try again.'
}

/** Returns today's calendar date in the learner's local timezone for task due-date comparisons. */
export function getLocalDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Formats the stored YYYY-MM-DD task due date for the learner-facing list. */
export function formatTaskDueDate(dueDate) {
  if (!dueDate) return 'no date set'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(`${dueDate}T00:00:00`))
}

/** Formats Firestore timestamps while still handling a pending server timestamp. */
export function formatUploadDate(timestamp) {
  if (!timestamp?.toDate) return 'Saving date...'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(timestamp.toDate())
}

/** Formats the shared summary timestamp while handling an initial pending server timestamp. */
export function formatProgressTimestamp(timestamp) {
  if (!timestamp?.toDate) return 'just now'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp.toDate())
}
