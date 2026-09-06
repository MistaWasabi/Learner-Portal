// Firebase app bootstrap utilities.
import { initializeApp } from 'firebase/app'

// Firebase Authentication service and browser-session persistence support.
import { browserSessionPersistence, getAuth, setPersistence } from 'firebase/auth'

// Callable Functions provide trusted server-side tasks such as listing Firebase Auth users for an Admin.
import { getFunctions } from 'firebase/functions'

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
  // The REST task layer reads this public database address; it never contains a password or private key.
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

// Initialises one Firebase application for this browser tab.
const app = initializeApp(firebaseConfig)

// Exposes the Authentication service for use by the login and sign-out methods.
export const auth = getAuth(app)

// Exposes the non-relational Firestore database for document metadata records.
export const db = getFirestore(app)

// Uses the same region as the deployed Custom Claims functions, avoiding a cross-region Function call.
export const firebaseFunctions = getFunctions(app, 'us-central1')

// Exporting the configured address keeps REST URLs out of visual components.
export const realtimeDatabaseUrl = firebaseConfig.databaseURL

// Keeps Firebase's signed-in session for this browser session only. This allows a
// page refresh to restore the user, but Firebase clears the session when the
// browser session ends. Firebase keeps an authentication credential here; it
// never stores the learner's password, and this app does not write credentials
// or profile details to cookies, localStorage, or sessionStorage itself.
export const authPersistenceReady = setPersistence(auth, browserSessionPersistence)
