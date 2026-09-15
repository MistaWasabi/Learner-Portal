import { httpsCallable } from 'firebase/functions'
import { firebaseFunctions } from '../../firebase'
import { getAllTasksForAdmin } from '../tasks/taskManager.logic'

// The callable Function checks the Admin claim again on Firebase's server before returning any email address.
const listPortalUsersCallable = httpsCallable(firebaseFunctions, 'listPortalUsers')

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
