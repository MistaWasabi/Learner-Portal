import { realtimeDatabaseUrl } from '../../firebase'
import { taskCategories, taskPriorities } from '../shared/portal.logic'

// Realtime Database replaces this value on the server, preventing the browser from choosing timestamps.
const serverTimestamp = { '.sv': 'timestamp' }

/** Returns a task validation message before data is sent to the Realtime Database REST API. */
export function validateTask(taskForm) {
  if (!taskForm.title.trim()) return 'Task title is required.'
  if (taskForm.title.trim().length > 120) return 'Task title must be 120 characters or fewer.'
  if (!taskForm.dueDate) return 'Choose a due date.'
  if (!taskCategories.includes(taskForm.category)) return 'Choose a valid task category.'
  if (!taskPriorities.includes(taskForm.priority)) return 'Choose a valid priority.'
  return ''
}

/** Converts the public Realtime Database address into a predictable REST endpoint without exposing tokens in logs. */
function createRestUrl(path, idToken) {
  const baseUrl = realtimeDatabaseUrl?.replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('Realtime Database is not configured. Add VITE_FIREBASE_DATABASE_URL to .env.local and restart Vite.')
  }

  return `${baseUrl}/${path}.json?auth=${encodeURIComponent(idToken)}`
}

/** Records assessment-friendly request evidence without storing a Firebase ID token or task content. */
function createRequestEvidence(method, path, response) {
  const evidence = {
    method,
    path: `/${path}`,
    status: response.status,
    recordedAt: new Date().toISOString(),
  }

  // The browser console can be screenshotted for assessment evidence while keeping credentials private.
  console.info('[Realtime Database REST]', evidence)
  return evidence
}

/** Sends an authenticated REST request as the current Firebase user and returns safe evidence metadata. */
async function sendTaskRequest(user, method, path, body) {
  const idToken = await user.getIdToken()
  const response = await fetch(createRestUrl(path, idToken), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const request = createRequestEvidence(method, path, response)
  const responseText = await response.text()
  let data = null

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      // A malformed Firebase response is handled below using a generic, safe message.
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error || 'Realtime Database rejected the request.')
    error.status = response.status
    throw error
  }

  return { data, request }
}

/** Loads one learner's task records with an explicit REST GET request. */
export async function getOwnTasks(user) {
  const result = await sendTaskRequest(user, 'GET', `tasks/${user.uid}`)
  const tasks = Object.entries(result.data || {})
    .map(([id, task]) => ({ id, ...task }))
    .sort((firstTask, secondTask) => (secondTask.createdAt || 0) - (firstTask.createdAt || 0))

  return { tasks, request: result.request }
}

/** Creates a task with REST POST and Firebase's server-generated timestamp values. */
export async function createTask(user, taskForm) {
  return sendTaskRequest(user, 'POST', `tasks/${user.uid}`, {
    title: taskForm.title.trim(),
    category: taskForm.category,
    dueDate: taskForm.dueDate,
    priority: taskForm.priority,
    completed: taskForm.completed,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  })
}

/** Updates editable task fields through REST PATCH while rules protect the original creation timestamp. */
export async function updateTask(user, taskId, taskForm) {
  return sendTaskRequest(user, 'PATCH', `tasks/${user.uid}/${taskId}`, {
    title: taskForm.title.trim(),
    category: taskForm.category,
    dueDate: taskForm.dueDate,
    priority: taskForm.priority,
    completed: taskForm.completed,
    updatedAt: serverTimestamp,
  })
}

/** Changes only a task's completion state using REST PATCH. */
export async function updateTaskCompletion(user, task) {
  return sendTaskRequest(user, 'PATCH', `tasks/${user.uid}/${task.id}`, {
    completed: !task.completed,
    updatedAt: serverTimestamp,
  })
}

/** Removes one learner-owned task through REST DELETE. */
export async function deleteTask(user, taskId) {
  return sendTaskRequest(user, 'DELETE', `tasks/${user.uid}/${taskId}`)
}

/** Lets the Admin-only screen read every task after Realtime Database rules verify the Admin claim. */
export async function getAllTasksForAdmin(user) {
  const result = await sendTaskRequest(user, 'GET', 'tasks')
  return { tasksByOwner: result.data || {}, request: result.request }
}

/** Converts REST failures into feedback that explains the likely configuration or access problem. */
export function getTaskManagerError(error, action) {
  if (error.status === 401 || error.status === 403) {
    return 'Realtime Database blocked this action. Check your account role and the published database rules.'
  }
  if (error.message.includes('Realtime Database is not configured')) return error.message
  return action === 'load'
    ? 'Your tasks could not be loaded. Please try again.'
    : action === 'delete'
      ? 'Your task could not be deleted. Please try again.'
      : 'Your task could not be saved. Please try again.'
}

/** Formats one safe request-evidence timestamp for the visible assessment log. */
export function formatRestRequestTime(timestamp) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(timestamp))
}

/** Downloads credential-free REST evidence so the assessor can inspect the request history without browser DevTools. */
export function downloadRestEvidence(restRequests) {
  const evidence = {
    title: 'Learner Portal Realtime Database REST CRUD evidence',
    generatedAt: new Date().toISOString(),
    // The export intentionally contains no ID token, email address, task title, or task body.
    privacyNote: 'Only REST method, database path, response status, and timestamp are recorded.',
    requests: restRequests,
  }
  const downloadUrl = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], {
    type: 'application/json',
  }))
  const downloadLink = document.createElement('a')

  downloadLink.href = downloadUrl
  downloadLink.download = `realtime-database-rest-evidence-${new Date().toISOString().slice(0, 10)}.json`
  downloadLink.click()
  URL.revokeObjectURL(downloadUrl)
}
