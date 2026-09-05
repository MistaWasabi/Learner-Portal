const functions = require('firebase-functions/v1')
const { getApps, initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

// The Admin SDK runs only in Firebase's trusted environment and is never sent to React.
if (!getApps().length) {
  initializeApp()
}

const validRoles = new Set(['admin', 'teacher', 'student'])

/** Assigns the least-privileged role automatically when a new Firebase Auth account is created. */
exports.assignDefaultStudentRole = functions.auth.user().onCreate(async (user) => {
  const existingClaims = user.customClaims || {}

  // Preserve other trusted claims in case the account is created by a future managed process.
  if (validRoles.has(existingClaims.role)) return null

  await getAuth().setCustomUserClaims(user.uid, {
    ...existingClaims,
    role: 'student',
  })

  console.log(`Assigned student role to ${user.uid}`)
  return null
})

/**
 * Allows only an existing admin to promote or change another account's role.
 * The browser can request this operation, but the server validates the caller's token before any claim changes.
 */
exports.assignRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in before changing roles.')
  }

  if (context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only an admin can change roles.')
  }

  const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : ''
  const role = typeof data?.role === 'string' ? data.role : ''

  if (!email || !email.includes('@') || !validRoles.has(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Provide a valid email address and role.')
  }

  const targetUser = await getAuth().getUserByEmail(email)
  await getAuth().setCustomUserClaims(targetUser.uid, {
    ...(targetUser.customClaims || {}),
    role,
  })

  console.log(`Admin ${context.auth.uid} assigned ${role} role to ${targetUser.uid}`)
  return { uid: targetUser.uid, role }
})
