import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../../firebase'

// File types remain allow-listed in Storage Rules as well as here; client checks improve feedback but Rules enforce safety.
export const acceptedDocumentTypes = {
  'application/pdf': 'PDF',
  'application/msword': 'Word document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
  'application/vnd.oasis.opendocument.text': 'OpenDocument text',
  'application/rtf': 'Rich text document',
  'text/plain': 'Text document',
}

export const acceptedDocumentInputTypes = Object.keys(acceptedDocumentTypes).join(',')
export const maximumDocumentBytes = 10 * 1024 * 1024

/** Creates the owner-only document query and converts Firestore snapshots into view-ready records. */
export function subscribeToDocuments(user, { onDocuments, onError }) {
  const documentQuery = query(collection(db, 'users', user.uid, 'documents'), orderBy('createdAt', 'desc'))

  return onSnapshot(
    documentQuery,
    (snapshot) => onDocuments(snapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    }))),
    onError,
  )
}

/** Checks the title, Browser File object, MIME type, and size before any upload bytes leave the browser. */
export function validateDocumentUpload(title, file) {
  if (!title.trim()) return { error: 'Document title is required.' }
  if (!file) return { error: 'Choose a document file to upload.' }
  if (!Object.hasOwn(acceptedDocumentTypes, file.type)) {
    return { error: 'Upload a PDF, Word, OpenDocument, RTF, or plain-text file.' }
  }
  if (file.size === 0) return { error: 'Choose a document file that is not empty.' }
  if (file.size > maximumDocumentBytes) return { error: 'Documents must be 10 MB or smaller.' }
  return {}
}

/** Keeps a download filename predictable and prevents a filename from adding an unsafe header character. */
function createContentDisposition(fileName) {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9 ._()-]/g, '_').slice(0, 120) || 'learning-document'
  return `attachment; filename="${safeFileName}"`
}

/**
 * Uploads document bytes to the authenticated learner's Storage path, then saves only non-sensitive metadata in Firestore.
 * A generated Firestore ID is reused as the Storage filename so the metadata rule can prove both records belong together.
 */
export async function uploadDocument(user, { title, file }) {
  const documentReference = doc(collection(db, 'users', user.uid, 'documents'))
  const storagePath = `documents/${user.uid}/${documentReference.id}`
  const storageReference = ref(storage, storagePath)
  let fileUploaded = false

  try {
    await uploadBytes(storageReference, file, {
      contentType: file.type,
      contentDisposition: createContentDisposition(file.name),
    })
    fileUploaded = true

    await setDoc(documentReference, {
      name: title.trim(),
      storagePath,
      contentType: file.type,
      fileSize: file.size,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    // Firestore and Storage cannot share one transaction, so remove an uploaded file if metadata creation fails.
    if (fileUploaded) {
      try {
        await deleteObject(storageReference)
      } catch {
        // Preserve the original failure; a failed cleanup can be reviewed in Firebase Storage if needed.
      }
    }
    throw error
  }
}

/** Retrieves a Firebase download URL only when requested; the application never persists it in Firestore or browser storage. */
export async function downloadDocumentFile(documentRecord) {
  const downloadUrl = await getDownloadURL(ref(storage, documentRecord.storagePath))
  const downloadLink = document.createElement('a')

  downloadLink.href = downloadUrl
  // The temporary link is used immediately rather than being saved in state, a cookie, or either Firebase database.
  downloadLink.download = documentRecord.name
  downloadLink.rel = 'noreferrer'
  downloadLink.click()
}

/** Opens a legacy external-link record without changing it; new records are uploaded to Firebase Storage instead. */
export function openLegacyDocumentLink(documentRecord) {
  window.open(documentRecord.url, '_blank', 'noopener,noreferrer')
}

/** Deletes the Storage object first, then removes its matching Firestore metadata record. */
export async function removeDocument(user, documentRecord) {
  if (documentRecord.storagePath) {
    try {
      await deleteObject(ref(storage, documentRecord.storagePath))
    } catch (error) {
      // A missing old object should not leave an undeletable metadata record in the learner's library.
      if (error.code !== 'storage/object-not-found') throw error
    }
  }

  await deleteDoc(doc(db, 'users', user.uid, 'documents', documentRecord.id))
}

/** Formats a compact, learner-readable file size from the metadata instead of exposing raw byte counts. */
export function formatDocumentSize(fileSize) {
  if (!Number.isFinite(fileSize)) return 'Legacy link'
  if (fileSize < 1024 * 1024) return `${Math.max(1, Math.round(fileSize / 1024))} KB`
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
}
