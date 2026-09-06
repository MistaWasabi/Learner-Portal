import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatUploadDate, getDocumentLibraryError } from '../shared/portal.logic'
import './DocumentLibrary.css'

export function DocumentLibrary({ user }) {
  // Tracks Firestore records, link-form input, and clear feedback for this one learner.
  const [documents, setDocuments] = useState([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingDocumentId, setDeletingDocumentId] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  // Firestore subcollections provide a simple non-relational, user-owned document structure.
  useEffect(() => {
    const documentCollection = collection(db, 'users', user.uid, 'documents')
    const documentQuery = query(documentCollection, orderBy('createdAt', 'desc'))

    // Keeps the library in sync when a document record is added, changed, or removed.
    const unsubscribe = onSnapshot(
      documentQuery,
      (snapshot) => {
        setDocuments(snapshot.docs.map((documentSnapshot) => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data(),
        })))
        setLoadError('')
        setIsLoading(false)
      },
      (error) => {
        setLoadError(getDocumentLibraryError(error, 'load'))
        setIsLoading(false)
      },
    )

    // Stops the real-time listener when the learner signs out or the component closes.
    return unsubscribe
  }, [user.uid])

  /** Validates an external document link, then stores its small record in Firestore. */
  async function handleDocumentSave(event) {
    event.preventDefault()

    setSaveError('')
    setSaveSuccess('')

    if (!documentTitle.trim()) {
      setSaveError('Document title is required.')
      return
    }

    let safeUrl
    try {
      safeUrl = new URL(documentUrl.trim())
    } catch {
      setSaveError('Enter a complete HTTPS document link.')
      return
    }

    if (safeUrl.protocol !== 'https:') {
      setSaveError('Use a secure HTTPS document link.')
      return
    }

    try {
      setIsSaving(true)

      // Firestore stores only small structured link data, avoiding a paid file-storage dependency.
      await addDoc(collection(db, 'users', user.uid, 'documents'), {
        name: documentTitle.trim(),
        url: safeUrl.toString(),
        createdAt: serverTimestamp(),
      })

      // Clears the public link form after Firestore creates the learner-owned record.
      setDocumentTitle('')
      setDocumentUrl('')
      setSaveSuccess('Document link added to your library.')
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  /** Confirms and removes the selected learner-owned link record from Firestore. */
  async function handleDocumentDelete(documentRecord) {
    const shouldDelete = window.confirm(`Delete “${documentRecord.name}” from your document library?`)

    if (!shouldDelete) return

    setSaveError('')
    setSaveSuccess('')

    try {
      setDeletingDocumentId(documentRecord.id)
      // The Firestore rules also verify that this path belongs to the signed-in user.
      await deleteDoc(doc(db, 'users', user.uid, 'documents', documentRecord.id))
      setSaveSuccess('Document link deleted. You can save a replacement link at any time.')
    } catch (error) {
      setSaveError(getDocumentLibraryError(error, 'delete'))
    } finally {
      setDeletingDocumentId('')
    }
  }

  return (
    <section className="dashboard-card document-library" aria-labelledby="documents-heading">
      <div className="library-heading">
        <div>
          <h2 id="documents-heading">Document library</h2>
          <p>Save private links to your learning documents without uploading files to Firebase.</p>
        </div>
      </div>

      <form className="document-link-form" onSubmit={handleDocumentSave} noValidate>
        <div className="document-inputs">
          <label htmlFor="document-title">Document title</label>
          <input
            id="document-title"
            type="text"
            value={documentTitle}
            onChange={(event) => setDocumentTitle(event.target.value)}
            maxLength="120"
            placeholder="For example, JavaScript notes"
          />
        </div>
        <div className="document-inputs">
          <label htmlFor="document-url">Document link</label>
          <input
            id="document-url"
            type="url"
            value={documentUrl}
            onChange={(event) => setDocumentUrl(event.target.value)}
            placeholder="https://drive.google.com/..."
            aria-describedby="document-help"
          />
          <p id="document-help" className="document-help">Use a shareable HTTPS link, such as a Google Drive document.</p>
        </div>
        <button className="document-save-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving link...' : 'Save document link'}
        </button>
      </form>

      {saveError && <p className="error library-status" role="alert">{saveError}</p>}
      {saveSuccess && <p className="success library-status" role="status">{saveSuccess}</p>}
      {loadError && <p className="error library-status" role="alert">{loadError}</p>}

      <div className="document-list" aria-live="polite">
        {isLoading && <p className="empty-library">Loading your documents...</p>}
        {!isLoading && !loadError && documents.length === 0 && (
          <p className="empty-library">No document links yet. Save your first learning link above.</p>
        )}
        {documents.map((document) => (
          <article className="document-item" key={document.id}>
            <div>
              <h3>{document.name}</h3>
              <p>Added {formatUploadDate(document.createdAt)}</p>
            </div>
            <div className="document-actions">
              <a className="document-open-button" href={document.url} target="_blank" rel="noreferrer">
                Open
              </a>
              <button
                className="document-delete-button"
                type="button"
                onClick={() => handleDocumentDelete(document)}
                disabled={deletingDocumentId === document.id}
              >
                {deletingDocumentId === document.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

