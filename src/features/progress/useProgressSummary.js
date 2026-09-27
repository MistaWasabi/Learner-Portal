import { useState } from 'react'
import { downloadProgressSummary, getProgressSummaryError } from './progressSummary.logic'

/**
 * Keeps browser-download feedback outside the visual progress-summary card.
 * The report is generated only when the learner chooses the button, so it never becomes stored application state.
 */
export function useProgressSummary(user, overview) {
  const [downloadStatus, setDownloadStatus] = useState('')
  const [downloadError, setDownloadError] = useState('')

  function handleDownload() {
    try {
      downloadProgressSummary({ user, overview })
      setDownloadError('')
      setDownloadStatus('Progress summary downloaded as a .txt file.')
    } catch (error) {
      console.error('Progress summary download failed.', error)
      setDownloadStatus('')
      setDownloadError(getProgressSummaryError(error))
    }
  }

  return { downloadError, downloadStatus, handleDownload }
}
