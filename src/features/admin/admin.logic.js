import { httpsCallable } from 'firebase/functions'
import { firebaseFunctions } from '../../firebase'
import { getAllTasksForAdmin } from '../tasks/taskManager.logic'

// The callable Function checks the Admin claim again on Firebase's server before returning any email address.
const listPortalUsersCallable = httpsCallable(firebaseFunctions, 'listPortalUsers')
// Role changes cross the same trusted boundary: React requests them, but can never write a Custom Claim itself.
const assignRoleCallable = httpsCallable(firebaseFunctions, 'assignRole')

// Keeping this allow-list beside the request prevents the Admin form from sending unexpected role values.
export const assignableRoles = ['student', 'teacher', 'admin']

/** Loads every Firebase Auth user in pages so the directory still works after the portal grows beyond 1,000 users. */
export async function getAllPortalUsers() {
  const users = []
  let pageToken = null

  do {
    const response = await listPortalUsersCallable({ pageSize: 1000, pageToken })
    const page = response.data
    users.push(...(page.users || []))
    pageToken = page.nextPageToken || null
  } while (pageToken)

  return users.sort((firstUser, secondUser) => (
    firstUser.displayName.localeCompare(secondUser.displayName)
  ))
}

/** Sends only the selected Firebase Auth UID and requested role to the Admin-protected Cloud Function. */
export async function assignPortalUserRole(uid, role) {
  if (!uid) throw new Error('Select a user before assigning a role.')
  if (!assignableRoles.includes(role)) throw new Error('Choose a valid portal role.')

  const response = await assignRoleCallable({ uid, role })
  return response.data
}

/** Adds the owner UID to each task only in Admin memory, letting the page connect task records to the secure directory. */
export function flattenAdminTasks(tasksByOwner) {
  return Object.entries(tasksByOwner).flatMap(([ownerUid, ownerTasks]) => (
    Object.entries(ownerTasks || {}).map(([id, task]) => ({
      id,
      ownerUid,
      ...task,
    }))
  )).sort((firstTask, secondTask) => (secondTask.createdAt || 0) - (firstTask.createdAt || 0))
}

/** Loads the two protected Admin data sources together so the directory and task counts stay in sync. */
export async function loadAdminDatabase(user) {
  const [portalUsers, taskResult] = await Promise.all([
    getAllPortalUsers(),
    getAllTasksForAdmin(user),
  ])

  return {
    portalUsers,
    tasks: flattenAdminTasks(taskResult.tasksByOwner),
    restRequest: taskResult.request,
  }
}

/** Counts tasks in memory, avoiding a duplicate directory or ownership field in Realtime Database. */
export function getTaskCountByOwner(tasks) {
  return tasks.reduce((counts, task) => ({
    ...counts,
    [task.ownerUid]: (counts[task.ownerUid] || 0) + 1,
  }), {})
}

/** Creates a temporary UID lookup for the current protected Admin page render only. */
export function getPortalUsersByUid(portalUsers) {
  return Object.fromEntries(portalUsers.map((portalUser) => [portalUser.uid, portalUser]))
}

/** Converts Functions and REST errors into a privacy-safe explanation for an Admin. */
export function getAdminDatabaseError(error) {
  if (error.code === 'functions/permission-denied' || error.status === 401 || error.status === 403) {
    return 'Administrator access is required. Sign out and back in to refresh your Admin claim, then try again.'
  }
  return 'The administrator directory could not be loaded. Check that the Functions and Realtime Database rules are deployed.'
}

/** Keeps role-assignment feedback clear without exposing Cloud Function implementation details or tokens. */
export function getRoleAssignmentError(error) {
  if (error.message === 'Select a user before assigning a role.' || error.message === 'Choose a valid portal role.') {
    return error.message
  }
  if (error.code === 'functions/permission-denied' || error.code === 'functions/unauthenticated') {
    return 'Only an Admin with a current Firebase session can change roles. Sign out and back in, then try again.'
  }
  if (error.code === 'functions/not-found') {
    return 'That Firebase user no longer exists. Refresh the directory and choose another user.'
  }
  return 'The role could not be changed. The Cloud Function did not confirm an update.'
}
