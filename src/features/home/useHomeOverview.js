import { useEffect, useMemo, useState } from 'react'
import { createHomeOverview, subscribeToHomeOverview } from './home.logic'

/** Keeps Home subscriptions and calculated totals away from the presentational HomeOverview component. */
export function useHomeOverview(user) {
  const [tasks, setTasks] = useState([])
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [lessonProgress, setLessonProgress] = useState([])
  const [documentCount, setDocumentCount] = useState(0)
  const [overviewError, setOverviewError] = useState('')

  useEffect(() => subscribeToHomeOverview(user, {
    onTasks: setTasks,
    onDocumentCount: setDocumentCount,
    onCourseIds: setSelectedCourseIds,
    onLessonProgress: setLessonProgress,
    onError: setOverviewError,
  }), [user])

  const overview = useMemo(() => createHomeOverview({
    tasks,
    selectedCourseIds,
    lessonProgress,
    documentCount,
  }), [tasks, selectedCourseIds, lessonProgress, documentCount])

  return { overview, overviewError }
}
