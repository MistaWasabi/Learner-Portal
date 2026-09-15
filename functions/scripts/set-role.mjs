import { readFile } from 'node:fs/promises'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// This script is intentionally run by a project maintainer, never by React or a normal learner.
const validRoles = new Set(['admin', 'teacher', 'student'])
const [role, emailArgument] = process.argv.slice(2)
const email = emailArgument?.trim().toLowerCase()
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH

if (!validRoles.has(role) || !email) {
  throw new Error('Usage: node scripts/set-role.mjs <admin|teacher|student> <email-address>')
}

if (!serviceAccountPath) {
  throw new Error('Set FIREBASE_SERVICE_ACCOUNT_PATH to your downloaded Firebase service-account JSON file.')
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'))

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) })
}

const user = await getAuth().getUserByEmail(email)
await getAuth().setCustomUserClaims(user.uid, {
  ...(user.customClaims || {}),
  role,
})

console.log(`Assigned ${role} role to ${email}. They must sign out and sign in again to receive the new token.`)
