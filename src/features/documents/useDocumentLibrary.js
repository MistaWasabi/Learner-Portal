import { useEffect, useState } from 'react'
import { getDocumentLibraryError } from '../shared/portal.logic'
import { removeDocumentLink, saveDocumentLink, subscribeToDocuments, validateDocumentLink } from './documentLibrary.logic'

/** Owns Document Library state and Firestore interactions so DocumentLibrary.jsx focuses on accessible markup. */
export function useDocumentLibrary(user) {
  const [documents, setDocuments] = useState([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingDocumentId, setDeletingDocumentId] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => subscribeToDocuments(user, {
    onDocuments: (nextDocuments) => {
      setDocuments(nextDocuments)
      setLoadError('')
      setIsLoading(false)
    },
    onError: (error) => {
      setLoadError(getDocumentLibraryError(error, 'load'))
      setIsLoading(false)
    },
  }), [user])

  /** Validates and saves a link record, clearing the public form values only after a successful write. */
  async function handleDocumentSave(event) {
    event.preventDefault()
    setSaveError('')
    setSaveSuccess('')

    const validation = validateDocumentLink(documentTitle, documentUrl)
    if (validation.error) {
      setSaveError(validation.error)
      return
    }

    try {
      setIsSaving(true)
      await saveDocumentLink(user, { title: documentTitle, url: validation.safeUrl })
      setDocumentTitle('')
      setDocumentUrl('')
      setSaveSuccess('Document link added to your library.')
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  /** Requests browser confirmation, then delegates the protected deletion to the non-visual data module. */
  async function handleDocumentDelete(documentRecord) {
    if (!window.confirm(`Delete “${documentRecord.name}” from your document library?`)) return

    setSaveError('')
    setSaveSuccess('')

    try {
      setDeletingDocumentId(documentRecord.id)
      await removeDocumentLink(user, documentRecord.id)
      setSaveSuccess('Document link deleted. You can save a replacement link at any time.')
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'delete'))
    } finally {
      setDeletingDocumentId('')
    }
  }

  return {
    documents,
    documentTitle,
    documentUrl,
    isLoading,
    isSaving,
    deletingDocumentId,
    loadError,
    saveError,
    saveSuccess,
    setDocumentTitle,
    setDocumentUrl,
    handleDocumentSave,
    handleDocumentDelete,
  }
}
