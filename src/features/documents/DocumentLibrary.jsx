import { formatUploadDate } from '../shared/portal.logic'
import { acceptedDocumentInputTypes, formatDocumentSize } from './documentLibrary.logic'
import { useDocumentLibrary } from './useDocumentLibrary'
import './DocumentLibrary.css'

/** Renders the private Firebase Storage document interface; the hook owns upload, download, deletion, and Firestore metadata work. */
export function DocumentLibrary({ user }) {
  const {
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
  } = useDocumentLibrary(user)

  return (
    <section className="dashboard-card document-library" aria-labelledby="documents-heading">
      <div className="document-library-heading">
        <div>
          <h2 id="documents-heading">Document library</h2>
          <p>Upload private learning documents to Firebase Storage. Your account controls access through the portal.</p>
        </div>
      </div>

      <form className="document-upload-form" onSubmit={handleDocumentSave} noValidate>
        <div className="document-upload-field">
          <label htmlFor="document-title">Document title</label>
          <input id="document-title" type="text" value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} maxLength="120" placeholder="For example, JavaScript notes" />
        </div>
        <div className="document-upload-field">
          <label htmlFor="document-file">Document file</label>
          <input key={fileInputVersion} id="document-file" type="file" accept={acceptedDocumentInputTypes} onChange={handleDocumentFileChange} aria-describedby="document-upload-help" />
          <p id="document-upload-help" className="document-upload-help">PDF, Word, OpenDocument, RTF, or text · maximum 10 MB.</p>
          {documentFile && <p className="document-selected-file">Selected: {documentFile.name}</p>}
        </div>
        <button className="document-upload-button" type="submit" disabled={isSaving}>{isSaving ? 'Uploading document...' : 'Upload document'}</button>
      </form>

      {saveError && <p className="document-library-error" role="alert">{saveError}</p>}
      {saveSuccess && <p className="document-library-success" role="status">{saveSuccess}</p>}
      {loadError && <p className="document-library-error" role="alert">{loadError}</p>}

      <div className="document-library-list" aria-live="polite">
        {isLoading && <p className="document-library-empty">Loading your documents...</p>}
        {!isLoading && !loadError && documents.length === 0 && <p className="document-library-empty">No documents yet. Upload your first learning document above.</p>}
        {documents.map((document) => (
          <article className="document-library-item" key={document.id}>
            <div>
              <h3>{document.name}</h3>
              <p>{document.storagePath ? `${formatDocumentSize(document.fileSize)} · ` : 'Legacy external link · '}Added {formatUploadDate(document.createdAt)}</p>
            </div>
            <div className="document-library-actions">
              <button className="document-library-open-button" type="button" onClick={() => handleDocumentOpen(document)} disabled={openingDocumentId === document.id}>
                {openingDocumentId === document.id ? 'Opening...' : document.storagePath ? 'Download' : 'Open link'}
              </button>
              <button className="document-library-delete-button" type="button" onClick={() => handleDocumentDelete(document)} disabled={deletingDocumentId === document.id}>
                {deletingDocumentId === document.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
