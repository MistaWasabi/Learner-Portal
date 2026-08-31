// Firebase app bootstrap utilities.
import { initializeApp } from 'firebase/app'

// Firebase Authentication service and memory-only session support.
import { getAuth, inMemoryPersistence, setPersistence } from 'firebase/auth'

// Firestore stores the portal's non-relational document-link records.
import { getFirestore } from 'firebase/firestore'

// Public browser configuration values loaded from the local Vite environment file.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialises one Firebase application for this browser tab.
const app = initializeApp(firebaseConfig)

// Exposes the Authentication service for use by the login and sign-out methods.
export const auth = getAuth(app)

// Exposes the non-relational Firestore database for document metadata records.
export const db = getFirestore(app)

// Uses Firebase's NONE persistence: authentication stays only in live memory,
// so this app does not create a persistent Firebase browser session or cookie.
export const authPersistenceReady = setPersistence(auth, inMemoryPersistence)
