const functions = require('firebase-functions/v1')
const { getApps, initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

// The Admin SDK runs only in Firebase's trusted environment and is never sent to React.
if (!getApps().length) {
  initializeApp()
}

const validRoles = new Set(['admin', 'teacher', 'student'])

/** Stops a callable operation before it can expose user information to a non-admin account. */
function requireAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in before using administrator tools.')
  }

  if (context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only an admin can use administrator tools.')
  }
}

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
  // Role changes are a privileged operation, so the caller's token is checked on the server.
  requireAdmin(context)

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

/**
 * Returns a paginated, deliberately small Firebase Auth directory for the Admin-only screen.
 * Email addresses remain in Firebase Authentication until a verified Admin requests them;
 * they are never copied into Firestore or Realtime Database.
 */
exports.listPortalUsers = functions.https.onCall(async (data, context) => {
  requireAdmin(context)

  const requestedPageSize = Number(data?.pageSize)
  const pageSize = Number.isInteger(requestedPageSize)
    ? Math.min(Math.max(requestedPageSize, 1), 1000)
    : 250
  const pageToken = typeof data?.pageToken === 'string' ? data.pageToken : undefined
  const userPage = await getAuth().listUsers(pageSize, pageToken)

  return {
    users: userPage.users.map((userRecord) => ({
      uid: userRecord.uid,
      displayName: userRecord.displayName || 'Learner',
      email: userRecord.email || '',
      // Missing/invalid claims become Student in the directory, matching the client-side safe default.
      role: validRoles.has(userRecord.customClaims?.role) ? userRecord.customClaims.role : 'student',
      disabled: userRecord.disabled,
    })),
    nextPageToken: userPage.pageToken || null,
  }
})
