import { useEffect, useState } from 'react'
import { getDocumentLibraryError } from '../shared/portal.logic'
import {
  downloadDocumentFile,
  openLegacyDocumentLink,
  removeDocument,
  subscribeToDocuments,
  uploadDocument,
  validateDocumentUpload,
} from './documentLibrary.logic'

/** Owns Document Library state and Firebase interactions so DocumentLibrary.jsx focuses on accessible markup. */
export function useDocumentLibrary(user) {
  const [documents, setDocuments] = useState([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [fileInputVersion, setFileInputVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingDocumentId, setDeletingDocumentId] = useState('')
  const [openingDocumentId, setOpeningDocumentId] = useState('')
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

  /** Holds the browser File only in temporary React state; uploaded bytes are never cached by this application. */
  function handleDocumentFileChange(event) {
    setDocumentFile(event.target.files?.[0] ?? null)
    setSaveError('')
    setSaveSuccess('')
  }

  /** Validates and uploads a document, then clears its temporary title and File state after the two Firebase writes succeed. */
  async function handleDocumentSave(event) {
    event.preventDefault()
    setSaveError('')
    setSaveSuccess('')

    const validation = validateDocumentUpload(documentTitle, documentFile)
    if (validation.error) {
      setSaveError(validation.error)
      return
    }

    try {
      setIsSaving(true)
      await uploadDocument(user, { title: documentTitle, file: documentFile })
      setDocumentTitle('')
      setDocumentFile(null)
      // A keyed file input is recreated because browsers do not allow a normal controlled file-field reset.
      setFileInputVersion((currentVersion) => currentVersion + 1)
      setSaveSuccess('Document uploaded to your private library.')
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  /** Downloads a Storage-backed document or opens an older external-link entry without exposing a URL in Firestore. */
  async function handleDocumentOpen(documentRecord) {
    setSaveError('')
    setSaveSuccess('')

    try {
      setOpeningDocumentId(documentRecord.id)
      if (documentRecord.storagePath) {
        await downloadDocumentFile(documentRecord)
      } else {
        openLegacyDocumentLink(documentRecord)
      }
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'open'))
    } finally {
      setOpeningDocumentId('')
    }
  }

  /** Requests confirmation, then removes both the file bytes and matching metadata from the learner's own paths. */
  async function handleDocumentDelete(documentRecord) {
    if (!window.confirm(`Delete “${documentRecord.name}” from your document library? This removes the uploaded file as well.`)) return

    setSaveError('')
    setSaveSuccess('')

    try {
      setDeletingDocumentId(documentRecord.id)
      await removeDocument(user, documentRecord)
      setSaveSuccess('Document deleted. You can upload a replacement at any time.')
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'delete'))
    } finally {
      setDeletingDocumentId('')
    }
  }

  return {
    documents,
    documentTitle,
    documentFile,
    fileInputVersion,
    isLoading,
    isSaving,
    deletingDocumentId,
    openingDocumentId,
    loadError,
    saveError,
    saveSuccess,
    setDocumentTitle,
    handleDocumentFileChange,
    handleDocumentSave,
    handleDocumentOpen,
    handleDocumentDelete,
  }
}
