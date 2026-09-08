// Roles are allow-listed so an unexpected token value can never gain access in the interface.
const validRoles = new Set(['admin', 'teacher', 'student'])

// Keeping labels with claim checks prevents UI components from duplicating trusted role wording.
const roleLabels = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
}

/** Reads a trusted role from the Firebase ID token and defaults safely to student. */
export async function getUserRole(user) {
  const tokenResult = await user.getIdTokenResult(true)
  const role = tokenResult.claims.role
  return validRoles.has(role) ? role : 'student'
}

/** Returns whether a Custom Claim permits access to the shared learner-progress page. */
export function canViewLearnerProgress(role) {
  return role === 'admin' || role === 'teacher'
}

/** Returns whether a trusted role may triage and update support bookings for other learners. */
export function isSupportStaff(role) {
  return role === 'admin' || role === 'teacher'
}

/** Returns whether a Custom Claim permits access to administrator-only data, including learner emails. */
export function isAdmin(role) {
  return role === 'admin'
}

/** Returns a safe, readable role label for the sidebar without trusting unknown values. */
export function getRoleLabel(role) {
  return roleLabels[role] ?? roleLabels.student
}
