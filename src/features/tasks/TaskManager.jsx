import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { createEmptyTask, formatTaskDueDate, getTaskManagerError, taskCategories, taskPriorities } from '../shared/portal.logic'
import './TaskManager.css'

export function TaskManager({ user }) {
  // Holds the real-time Firestore records and the form state used to create or edit a task.
  const [tasks, setTasks] = useState([])
  const [taskForm, setTaskForm] = useState(createEmptyTask)
  const [editingTaskId, setEditingTaskId] = useState('')
  const [taskFilter, setTaskFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState('')
  const [taskError, setTaskError] = useState('')
  const [taskSuccess, setTaskSuccess] = useState('')

  // Each learner listens only to their own tasks, with the newest task shown first.
  useEffect(() => {
    const taskCollection = collection(db, 'users', user.uid, 'tasks')
    const taskQuery = query(taskCollection, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      taskQuery,
      (snapshot) => {
        setTasks(snapshot.docs.map((taskSnapshot) => ({
          id: taskSnapshot.id,
          ...taskSnapshot.data(),
        })))
        setTaskError('')
        setIsLoading(false)
      },
      (error) => {
        setTaskError(getTaskManagerError(error, 'load'))
        setIsLoading(false)
      },
    )

    // Ends the listener when the learner signs out, preventing unnecessary reads.
    return unsubscribe
  }, [user.uid])

  // Uses Array.filter to provide a clear client-side view of all, active, or completed tasks.
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === 'active') return !task.completed
    if (taskFilter === 'completed') return task.completed
    return true
  })

  /** Updates one form value without mutating the previous React state object. */
  function handleTaskFieldChange(event) {
    const { name, value } = event.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  /** Validates the fields before Firestore receives the new or changed task. */
  function validateTask() {
    if (!taskForm.title.trim()) return 'Task title is required.'
    if (taskForm.title.trim().length > 120) return 'Task title must be 120 characters or fewer.'
    if (!taskForm.dueDate) return 'Choose a due date.'
    if (!taskCategories.includes(taskForm.category)) return 'Choose a valid task category.'
    if (!taskPriorities.includes(taskForm.priority)) return 'Choose a valid priority.'
    return ''
  }

  /** Creates a task or saves edits while keeping the immutable creation date unchanged. */
  async function handleTaskSubmit(event) {
    event.preventDefault()

    const validationMessage = validateTask()
    setTaskError(validationMessage)
    setTaskSuccess('')
    if (validationMessage) return

    const taskData = {
      title: taskForm.title.trim(),
      category: taskForm.category,
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
      completed: taskForm.completed,
    }

    try {
      setIsSaving(true)

      if (editingTaskId) {
        // updateDoc changes only the editable fields; the rules keep createdAt immutable.
        await updateDoc(doc(db, 'users', user.uid, 'tasks', editingTaskId), taskData)
        setTaskSuccess('Task updated.')
      } else {
        // addDoc creates a Firestore document with an automatic ID for this learner's task.
        await addDoc(collection(db, 'users', user.uid, 'tasks'), {
          ...taskData,
          createdAt: serverTimestamp(),
        })
        setTaskSuccess('Task added.')
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

  /** Stops editing and restores a blank task form without changing Firestore data. */
  function cancelTaskEdit() {
    setTaskForm(createEmptyTask())
    setEditingTaskId('')
    setTaskError('')
    setTaskSuccess('')
  }

  /** Changes only the completed flag for a task, preserving all other task details. */
  async function handleTaskCompletion(task) {
    setTaskError('')
    setTaskSuccess('')

    try {
      await updateDoc(doc(db, 'users', user.uid, 'tasks', task.id), {
        completed: !task.completed,
      })
    } catch (error) {
      setTaskError(getTaskManagerError(error, 'save'))
    }
  }

  /** Confirms and deletes a task only from the current learner's Firestore path. */
  async function handleTaskDelete(task) {
    const shouldDelete = window.confirm(`Delete “${task.title}”? This cannot be undone.`)

    if (!shouldDelete) return

    setTaskError('')
    setTaskSuccess('')

    try {
      setDeletingTaskId(task.id)
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', task.id))
      if (editingTaskId === task.id) cancelTaskEdit()
      setTaskSuccess('Task deleted.')
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
          <p>Add, complete, edit, or remove tasks from your learning plan.</p>
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
            {taskCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <div className="task-field">
          <label htmlFor="task-due-date">Due date</label>
          <input id="task-due-date" name="dueDate" type="date" value={taskForm.dueDate} onChange={handleTaskFieldChange} />
        </div>
        <div className="task-field">
          <label htmlFor="task-priority">Priority</label>
          <select id="task-priority" name="priority" value={taskForm.priority} onChange={handleTaskFieldChange}>
            {taskPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
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
    </section>
  )
}

