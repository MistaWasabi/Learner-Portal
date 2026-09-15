import { useEffect, useState } from 'react'
import { getLearnerProgressError } from '../shared/portal.logic'
import { subscribeToLearnerProgress } from './progress.logic'

/** Keeps the shared progress subscription and loading feedback outside the presentational progress table. */
export function useLearnerProgress() {
  const [learnerSummaries, setLearnerSummaries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [progressError, setProgressError] = useState('')

  useEffect(() => subscribeToLearnerProgress({
    onSummaries: (summaries) => {
      setLearnerSummaries(summaries)
      setProgressError('')
      setIsLoading(false)
    },
    onError: (error) => {
      setProgressError(getLearnerProgressError(error))
      setIsLoading(false)
    },
  }), [])

  return { learnerSummaries, isLoading, progressError }
}
