// A fixed filename keeps the exported assessment evidence recognisable without placing profile data in a file path.
const progressSummaryFileName = 'learner-progress-summary.txt'

/** Formats the download timestamp in the learner's local timezone rather than using a server-side database write. */
export function formatProgressSummaryDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Creates a plain-text progress report from Home's already-authorised, owner-scoped totals.
 * The report deliberately excludes email addresses, Firebase UIDs, roles, and any authentication data.
 */
export function createProgressSummaryText({ user, overview, generatedAt = new Date() }) {
  const learnerName = user.displayName?.trim() || 'Learner'

  return [
    'LEARNER PORTAL - PROGRESS SUMMARY',
    `Generated: ${formatProgressSummaryDate(generatedAt)}`,
    `Learner: ${learnerName}`,
    '',
    'LEARNING',
    `Courses selected: ${overview.selectedCourseCount}`,
    `Lessons completed: ${overview.completedLessonCount}`,
    '',
    'TASKS',
    `Total tasks: ${overview.taskCount}`,
    `Completed tasks: ${overview.completedTaskCount}`,
    `Outstanding tasks: ${overview.outstandingTaskCount}`,
    `Overdue tasks: ${overview.overdueTaskCount}`,
    `Task completion rate: ${overview.completionRate}%`,
    '',
    'PORTAL ACTIVITY',
    `Saved documents: ${overview.documentCount}`,
    `Support requests: ${overview.supportBookingCount}`,
  ].join('\n')
}

/**
 * Downloads the generated report locally as a .txt file; nothing is uploaded, cached, or added to Firebase.
 * A temporary object URL is released afterwards so repeated downloads do not keep browser memory unnecessarily.
 */
export function downloadProgressSummary({ user, overview }) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Your browser cannot create a progress-summary download.')
  }

  const summaryText = createProgressSummaryText({ user, overview })
  const summaryBlob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' })
  const summaryUrl = URL.createObjectURL(summaryBlob)
  const downloadLink = document.createElement('a')

  downloadLink.href = summaryUrl
  downloadLink.download = progressSummaryFileName
  downloadLink.rel = 'noreferrer'
  document.body.append(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  window.setTimeout(() => URL.revokeObjectURL(summaryUrl), 0)
}

/** Converts a browser-download failure into clear learner-facing feedback. */
export function getProgressSummaryError() {
  return 'Your progress summary could not be downloaded. Please try again.'
}
