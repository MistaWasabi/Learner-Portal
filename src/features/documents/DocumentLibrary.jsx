import { formatUploadDate } from '../shared/portal.logic'
import { useDocumentLibrary } from './useDocumentLibrary'
import './DocumentLibrary.css'

/** Renders the private document-link interface; the hook owns its Firestore work and feedback state. */
export function DocumentLibrary({ user }) {
  const {
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
  } = useDocumentLibrary(user)

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
          <input id="document-title" type="text" value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} maxLength="120" placeholder="For example, JavaScript notes" />
        </div>
        <div className="document-inputs">
          <label htmlFor="document-url">Document link</label>
          <input id="document-url" type="url" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://drive.google.com/..." aria-describedby="document-help" />
          <p id="document-help" className="document-help">Use a shareable HTTPS link, such as a Google Drive document.</p>
        </div>
        <button className="document-save-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving link...' : 'Save document link'}</button>
      </form>

      {saveError && <p className="error library-status" role="alert">{saveError}</p>}
      {saveSuccess && <p className="success library-status" role="status">{saveSuccess}</p>}
      {loadError && <p className="error library-status" role="alert">{loadError}</p>}

      <div className="document-list" aria-live="polite">
        {isLoading && <p className="empty-library">Loading your documents...</p>}
        {!isLoading && !loadError && documents.length === 0 && <p className="empty-library">No document links yet. Save your first learning link above.</p>}
        {documents.map((document) => (
          <article className="document-item" key={document.id}>
            <div>
              <h3>{document.name}</h3>
              <p>Added {formatUploadDate(document.createdAt)}</p>
            </div>
            <div className="document-actions">
              <a className="document-open-button" href={document.url} target="_blank" rel="noreferrer">Open</a>
              <button className="document-delete-button" type="button" onClick={() => handleDocumentDelete(document)} disabled={deletingDocumentId === document.id}>
                {deletingDocumentId === document.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
