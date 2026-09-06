import { useEffect, useState } from 'react'
import { createEmptyTask, formatTaskDueDate } from '../shared/portal.logic'
import {
  createTask,
  deleteTask,
  downloadRestEvidence,
  formatRestRequestTime,
  getOwnTasks,
  getTaskManagerError,
  updateTask,
  updateTaskCompletion,
  validateTask,
} from './taskManager.logic'
import './TaskManager.css'

export function TaskManager({ user }) {
  // Holds the learner's own REST-loaded task records and the shared create/edit form state.
  const [tasks, setTasks] = useState([])
  const [taskForm, setTaskForm] = useState(createEmptyTask)
  const [editingTaskId, setEditingTaskId] = useState('')
  const [taskFilter, setTaskFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState('')
  const [taskError, setTaskError] = useState('')
  const [taskSuccess, setTaskSuccess] = useState('')
  // Keeps a short, sanitised REST history that can be used as assessment evidence without exposing ID tokens.
  const [restRequestLog, setRestRequestLog] = useState([])

  /** Adds safe method/path/status metadata to the visible and console REST evidence log. */
  function recordRestRequests(...requests) {
    const newRequests = requests.filter(Boolean)
    if (!newRequests.length) return

    setRestRequestLog((current) => [...newRequests, ...current].slice(0, 12))
  }

  /** Performs the required final verification GET and synchronises the interface with the saved database data. */
  async function reloadTasks() {
    const { tasks: loadedTasks, request } = await getOwnTasks(user)
    setTasks(loadedTasks)
    recordRestRequests(request)
  }

  useEffect(() => {
    let isCurrentUser = true

    // The state updates happen after the REST promise resolves, rather than directly
    // inside the effect, so React avoids an unnecessary synchronous render cascade.
    getOwnTasks(user)
      .then(({ tasks: loadedTasks, request }) => {
        if (!isCurrentUser) return
        setTasks(loadedTasks)
        setRestRequestLog((current) => [request, ...current].slice(0, 12))
        setTaskError('')
      })
      .catch((error) => {
        if (isCurrentUser) setTaskError(getTaskManagerError(error, 'load'))
      })
      .finally(() => {
        if (isCurrentUser) setIsLoading(false)
      })

    // Prevents an in-flight REST response for a previous login changing the next learner's screen.
    return () => {
      isCurrentUser = false
    }
  }, [user])

  // Array.filter keeps the interface fast while the protected database remains the single source of task records.
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === 'active') return !task.completed
    if (taskFilter === 'completed') return task.completed
    return true
  })

  /** Updates one form field without mutating the previous React state object. */
  function handleTaskFieldChange(event) {
    const { name, value } = event.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  /** Sends either a REST POST or PATCH, then immediately verifies the result with REST GET. */
  async function handleTaskSubmit(event) {
    event.preventDefault()

    const validationMessage = validateTask(taskForm)
    setTaskError(validationMessage)
    setTaskSuccess('')
    if (validationMessage) return

    try {
      setIsSaving(true)

      if (editingTaskId) {
        const { request } = await updateTask(user, editingTaskId, taskForm)
        recordRestRequests(request)
        await reloadTasks()
        setTaskSuccess('Task updated and verified with a GET request.')
      } else {
        const { request } = await createTask(user, taskForm)
        recordRestRequests(request)
        await reloadTasks()
        setTaskSuccess('Task added and verified with a GET request.')
      }

      setTaskForm(createEmptyTask())
      setEditingTaskId('')
    } catch (error) {
      setTaskError(getTaskManagerError(error, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  /** Loads a stored task into the shared form so the learner can edit it. */
  function handleTaskEdit(task) {
    setTaskForm({
      title: task.title,
      category: task.category,
      dueDate: task.dueDate,
      priority: task.priority,
      completed: task.completed,
    })
    setEditingTaskId(task.id)
    setTaskError('')
    setTaskSuccess('Editing task. Save changes when you are ready.')
  }

  /** Stops editing and restores a blank task form without changing database data. */
  function cancelTaskEdit() {
    setTaskForm(createEmptyTask())
    setEditingTaskId('')
    setTaskError('')
    setTaskSuccess('')
  }

  /** Uses REST PATCH to change only the completion state, followed by a verification GET. */
  async function handleTaskCompletion(task) {
    setTaskError('')
    setTaskSuccess('')

    try {
      const { request } = await updateTaskCompletion(user, task)
      recordRestRequests(request)
      await reloadTasks()
      setTaskSuccess('Task completion updated and verified with a GET request.')
    } catch (error) {
      setTaskError(getTaskManagerError(error, 'save'))
    }
  }

  /** Confirms and sends REST DELETE only for a task inside the signed-in learner's own database path. */
  async function handleTaskDelete(task) {
    const shouldDelete = window.confirm(`Delete “${task.title}”? This cannot be undone.`)

    if (!shouldDelete) return

    setTaskError('')
    setTaskSuccess('')

    try {
      setDeletingTaskId(task.id)
      const { request } = await deleteTask(user, task.id)
      recordRestRequests(request)
      await reloadTasks()
      if (editingTaskId === task.id) cancelTaskEdit()
      setTaskSuccess('Task deleted and verified with a GET request.')
    } catch (error) {
      setTaskError(getTaskManagerError(error, 'delete'))
    } finally {
      setDeletingTaskId('')
    }
  }

  return (
    <section className="dashboard-card task-manager" aria-labelledby="tasks-heading">
      <div className="task-manager-heading">
        <div>
          <h2 id="tasks-heading">Task manager</h2>
          <p>Add, complete, edit, or remove only your own tasks through Realtime Database REST requests.</p>
        </div>
        <label className="task-filter-control" htmlFor="task-filter">
          Show
          <select id="task-filter" value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}>
            <option value="all">All tasks</option>
            <option value="active">Active tasks</option>
            <option value="completed">Completed tasks</option>
          </select>
        </label>
      </div>

      <form className="task-form" onSubmit={handleTaskSubmit} noValidate>
        <div className="task-field task-title-field">
          <label htmlFor="task-title">Task title</label>
          <input
            id="task-title"
            name="title"
            type="text"
            value={taskForm.title}
            onChange={handleTaskFieldChange}
            maxLength="120"
            placeholder="For example, finish JavaScript exercise"
          />
        </div>
        <div className="task-field">
          <label htmlFor="task-category">Category</label>
          <select id="task-category" name="category" value={taskForm.category} onChange={handleTaskFieldChange}>
            <option>General</option>
            <option>JavaScript</option>
            <option>Project</option>
            <option>Support</option>
          </select>
        </div>
        <div className="task-field">
          <label htmlFor="task-due-date">Due date</label>
          <input id="task-due-date" name="dueDate" type="date" value={taskForm.dueDate} onChange={handleTaskFieldChange} />
        </div>
        <div className="task-field">
          <label htmlFor="task-priority">Priority</label>
          <select id="task-priority" name="priority" value={taskForm.priority} onChange={handleTaskFieldChange}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
        <div className="task-form-actions">
          <button className="task-save-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving task...' : editingTaskId ? 'Save changes' : 'Add task'}
          </button>
          {editingTaskId && (
            <button className="task-cancel-button" type="button" onClick={cancelTaskEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {taskError && <p className="error task-status" role="alert">{taskError}</p>}
      {taskSuccess && <p className="success task-status" role="status">{taskSuccess}</p>}

      <div className="task-list" aria-live="polite">
        {isLoading && <p className="empty-task-list">Loading your tasks...</p>}
        {!isLoading && !taskError && visibleTasks.length === 0 && (
          <p className="empty-task-list">No {taskFilter === 'all' ? '' : taskFilter} tasks to show.</p>
        )}
        {visibleTasks.map((task) => (
          <article className={`task-item ${task.completed ? 'task-completed' : ''}`} key={task.id}>
            <label className="task-complete-control">
              <input
                type="checkbox"
                checked={Boolean(task.completed)}
                onChange={() => handleTaskCompletion(task)}
                aria-label={`Mark ${task.title} as ${task.completed ? 'not completed' : 'completed'}`}
              />
              <span aria-hidden="true" />
            </label>
            <div className="task-details">
              <h3>{task.title}</h3>
              <p>{task.category} · Due {formatTaskDueDate(task.dueDate)}</p>
            </div>
            <div className="task-badges" aria-label="Task priority">
              <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
            </div>
            <div className="task-actions">
              <button className="task-edit-button" type="button" onClick={() => handleTaskEdit(task)}>
                Edit
              </button>
              <button
                className="task-delete-button"
                type="button"
                onClick={() => handleTaskDelete(task)}
                disabled={deletingTaskId === task.id}
              >
                {deletingTaskId === task.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="task-rest-evidence" aria-labelledby="rest-evidence-heading">
        <div className="task-rest-evidence-heading">
          <div>
          <h3 id="rest-evidence-heading">REST request evidence</h3>
          <p>Safe method, path, and status logs. Firebase ID tokens and task text are deliberately excluded.</p>
          </div>
          <button
            className="task-rest-download"
            type="button"
            onClick={() => downloadRestEvidence(restRequestLog)}
            disabled={restRequestLog.length === 0}
          >
            Download log
          </button>
        </div>
        {restRequestLog.length === 0 ? (
          <p className="task-rest-empty">Your REST requests will appear here after the database is configured.</p>
        ) : (
          <ul className="task-rest-log">
            {restRequestLog.map((request, index) => (
              <li key={`${request.recordedAt}-${request.method}-${index}`}>
                <strong className={`task-rest-method task-rest-method-${request.method.toLowerCase()}`}>{request.method}</strong>
                <span>{request.path}</span>
                <span>{request.status}</span>
                <time dateTime={request.recordedAt}>{formatRestRequestTime(request.recordedAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
