import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'

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

/** Validates an external link before Firestore stores only its small metadata record. */
export function validateDocumentLink(title, url) {
  if (!title.trim()) return { error: 'Document title is required.' }

  try {
    const safeUrl = new URL(url.trim())
    if (safeUrl.protocol !== 'https:') return { error: 'Use a secure HTTPS document link.' }
    return { safeUrl: safeUrl.toString() }
  } catch {
    return { error: 'Enter a complete HTTPS document link.' }
  }
}

/** Writes a title, HTTPS link, and server timestamp to the authenticated learner's Firestore path. */
export async function saveDocumentLink(user, { title, url }) {
  await addDoc(collection(db, 'users', user.uid, 'documents'), {
    name: title.trim(),
    url,
    createdAt: serverTimestamp(),
  })
}

/** Removes only one document-link record from the authenticated learner's own path. */
export async function removeDocumentLink(user, documentId) {
  await deleteDoc(doc(db, 'users', user.uid, 'documents', documentId))
}
