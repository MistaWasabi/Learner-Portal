import { httpsCallable } from 'firebase/functions'
import { firebaseFunctions } from '../../firebase'

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

/** Converts Functions and REST errors into a privacy-safe explanation for an Admin. */
export function getAdminDatabaseError(error) {
  if (error.code === 'functions/permission-denied' || error.status === 401 || error.status === 403) {
    return 'Administrator access is required. Sign out and back in to refresh your Admin claim, then try again.'
  }
  return 'The administrator directory could not be loaded. Check that the Functions and Realtime Database rules are deployed.'
}
