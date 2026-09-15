import { useEffect, useMemo, useState } from 'react'
import { createEmptyTask, taskCategories, taskPriorities } from '../shared/portal.logic'
import {
  createTask,
  deleteTask,
  downloadRestEvidence,
  getOwnTasks,
  getTaskManagerError,
  updateTask,
  updateTaskCompletion,
  validateTask,
} from './taskManager.logic'

/** Keeps Task Manager state, REST calls, and safe assessment logging outside the visual task list. */
export function useTaskManager(user) {
  const [tasks, setTasks] = useState([])
  const [taskForm, setTaskForm] = useState(createEmptyTask)
  const [editingTaskId, setEditingTaskId] = useState('')
  const [taskFilter, setTaskFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState('')
  const [taskError, setTaskError] = useState('')
  const [taskSuccess, setTaskSuccess] = useState('')
  const [restRequestLog, setRestRequestLog] = useState([])

  /** Adds only credential-free request metadata to the visible and downloadable assessment log. */
  function recordRestRequests(...requests) {
    const newRequests = requests.filter(Boolean)
    if (newRequests.length) setRestRequestLog((current) => [...newRequests, ...current].slice(0, 12))
  }

  /** Performs the required post-mutation GET and synchronises the interface with persisted task records. */
  async function reloadTasks() {
    const { tasks: loadedTasks, request } = await getOwnTasks(user)
    setTasks(loadedTasks)
    recordRestRequests(request)
  }

  useEffect(() => {
    let isCurrentUser = true

    getOwnTasks(user)
      .then(({ tasks: loadedTasks, request }) => {
        if (!isCurrentUser) return
        setTasks(loadedTasks)
        recordRestRequests(request)
        setTaskError('')
      })
      .catch((error) => {
        if (isCurrentUser) setTaskError(getTaskManagerError(error, 'load'))
      })
      .finally(() => {
        if (isCurrentUser) setIsLoading(false)
      })

    // Stops a late REST response from a previous account replacing the next learner's task list.
    return () => {
      isCurrentUser = false
    }
  }, [user])

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (taskFilter === 'active') return !task.completed
    if (taskFilter === 'completed') return task.completed
    return true
  }), [tasks, taskFilter])

  /** Updates one form field without mutating the previous task object. */
  function handleTaskFieldChange(event) {
    const { name, value } = event.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  /** Sends REST POST/PATCH then a verification GET, keeping all database details in taskManager.logic.js. */
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

  /** Loads a saved task into the shared form without sending a database request. */
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

  /** Returns the form to its initial state without changing the database. */
  function cancelTaskEdit() {
    setTaskForm(createEmptyTask())
    setEditingTaskId('')
    setTaskError('')
    setTaskSuccess('')
  }

  /** PATCHes only completion state and performs the assessment-required verification read. */
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

  /** Confirms and deletes only the selected learner-owned task through the REST data module. */
  async function handleTaskDelete(task) {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return

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

  return {
    taskCategories,
    taskPriorities,
    taskForm,
    editingTaskId,
    taskFilter,
    isLoading,
    isSaving,
    deletingTaskId,
    taskError,
    taskSuccess,
    restRequestLog,
    visibleTasks,
    setTaskFilter,
    handleTaskFieldChange,
    handleTaskSubmit,
    handleTaskEdit,
    cancelTaskEdit,
    handleTaskCompletion,
    handleTaskDelete,
    downloadEvidence: () => downloadRestEvidence(restRequestLog),
  }
}
