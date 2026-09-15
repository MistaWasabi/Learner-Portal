import { formatTaskDueDate } from '../shared/portal.logic'
import { formatRestRequestTime } from './taskManager.logic'
import { useTaskManager } from './useTaskManager'
import './TaskManager.css'

/** Renders task controls and credential-free evidence; useTaskManager owns REST workflow and state. */
export function TaskManager({ user }) {
  const {
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
    downloadEvidence,
  } = useTaskManager(user)

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
          <input id="task-title" name="title" type="text" value={taskForm.title} onChange={handleTaskFieldChange} maxLength="120" placeholder="For example, finish JavaScript exercise" />
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
          <button className="task-save-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving task...' : editingTaskId ? 'Save changes' : 'Add task'}</button>
          {editingTaskId && <button className="task-cancel-button" type="button" onClick={cancelTaskEdit}>Cancel</button>}
        </div>
      </form>

      {taskError && <p className="error task-status" role="alert">{taskError}</p>}
      {taskSuccess && <p className="success task-status" role="status">{taskSuccess}</p>}

      <div className="task-list" aria-live="polite">
        {isLoading && <p className="empty-task-list">Loading your tasks...</p>}
        {!isLoading && !taskError && visibleTasks.length === 0 && <p className="empty-task-list">No {taskFilter === 'all' ? '' : taskFilter} tasks to show.</p>}
        {visibleTasks.map((task) => (
          <article className={`task-item ${task.completed ? 'task-completed' : ''}`} key={task.id}>
            <label className="task-complete-control">
              <input type="checkbox" checked={Boolean(task.completed)} onChange={() => handleTaskCompletion(task)} aria-label={`Mark ${task.title} as ${task.completed ? 'not completed' : 'completed'}`} />
              <span aria-hidden="true" />
            </label>
            <div className="task-details">
              <h3>{task.title}</h3>
              <p>{task.category} · Due {formatTaskDueDate(task.dueDate)}</p>
            </div>
            <div className="task-badges" aria-label="Task priority"><span className={`priority-badge priority-${task.priority}`}>{task.priority}</span></div>
            <div className="task-actions">
              <button className="task-edit-button" type="button" onClick={() => handleTaskEdit(task)}>Edit</button>
              <button className="task-delete-button" type="button" onClick={() => handleTaskDelete(task)} disabled={deletingTaskId === task.id}>
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
          <button className="task-rest-download" type="button" onClick={downloadEvidence} disabled={restRequestLog.length === 0}>Download log</button>
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
