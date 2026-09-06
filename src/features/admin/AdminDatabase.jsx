import { useEffect, useState } from 'react'
import { formatTaskDueDate } from '../shared/portal.logic'
import { getAllTasksForAdmin } from '../tasks/taskManager.logic'
import { flattenAdminTasks, getAdminDatabaseError, getAllPortalUsers } from './admin.logic'
import './AdminDatabase.css'

export function AdminDatabase({ user }) {
  // Holds personally identifiable directory data only while an authenticated Admin is viewing this protected route.
  const [portalUsers, setPortalUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [adminError, setAdminError] = useState('')
  const [restRequest, setRestRequest] = useState(null)

  /** Reads the Auth directory through the trusted Function and all task paths through the Admin-only REST rule. */
  async function loadAdminData() {
    setIsLoading(true)
    setAdminError('')

    try {
      const [users, taskResult] = await Promise.all([
        getAllPortalUsers(),
        getAllTasksForAdmin(user),
      ])

      setPortalUsers(users)
      setTasks(flattenAdminTasks(taskResult.tasksByOwner))
      setRestRequest(taskResult.request)
    } catch (error) {
      setAdminError(getAdminDatabaseError(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrentAdmin = true

    // The initial view keeps its already-true loading state until both remote sources resolve.
    // This avoids setting state synchronously inside an effect and prevents stale data after a role/session change.
    Promise.all([
      getAllPortalUsers(),
      getAllTasksForAdmin(user),
    ])
      .then(([users, taskResult]) => {
        if (!isCurrentAdmin) return
        setPortalUsers(users)
        setTasks(flattenAdminTasks(taskResult.tasksByOwner))
        setRestRequest(taskResult.request)
      })
      .catch((error) => {
        if (isCurrentAdmin) setAdminError(getAdminDatabaseError(error))
      })
      .finally(() => {
        if (isCurrentAdmin) setIsLoading(false)
      })

    return () => {
      isCurrentAdmin = false
    }
  }, [user])

  // Task counts are calculated in memory so the directory does not copy or store email addresses in Realtime Database.
  const taskCountByOwner = tasks.reduce((counts, task) => ({
    ...counts,
    [task.ownerUid]: (counts[task.ownerUid] || 0) + 1,
  }), {})
  const userByUid = Object.fromEntries(portalUsers.map((portalUser) => [portalUser.uid, portalUser]))

  return (
    <div className="admin-database">
      <section className="dashboard-card admin-directory" aria-labelledby="admin-directory-heading">
        <div className="admin-section-heading">
          <div>
            <h2 id="admin-directory-heading">Administrator database</h2>
            <p>Firebase Authentication users and Realtime Database tasks. Email addresses are visible only to verified Admin claims.</p>
          </div>
          <button className="admin-refresh-button" type="button" onClick={loadAdminData} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>

        {adminError && <p className="error admin-status" role="alert">{adminError}</p>}
        {!adminError && restRequest && (
          <p className="admin-rest-status" role="status">
            Realtime Database {restRequest.method} {restRequest.path} returned {restRequest.status}.
          </p>
        )}

        <div className="admin-table-wrap">
          <table className="admin-user-table">
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Email address</th>
                <th scope="col">Role</th>
                <th scope="col">Tasks</th>
                <th scope="col">Account</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan="5">Loading protected administrator data...</td></tr>
              )}
              {!isLoading && !adminError && portalUsers.length === 0 && (
                <tr><td colSpan="5">No Firebase Authentication users were found.</td></tr>
              )}
              {portalUsers.map((portalUser) => (
                <tr key={portalUser.uid}>
                  <td>{portalUser.displayName}</td>
                  <td>{portalUser.email || 'No email address'}</td>
                  <td><span className={`admin-role-badge admin-role-${portalUser.role}`}>{portalUser.role}</span></td>
                  <td>{taskCountByOwner[portalUser.uid] || 0}</td>
                  <td>{portalUser.disabled ? 'Disabled' : 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-card admin-task-records" aria-labelledby="admin-task-records-heading">
        <div className="admin-section-heading">
          <div>
            <h2 id="admin-task-records-heading">All learner tasks</h2>
            <p>Read-only overview of every user-owned task stored at <code>/tasks/&#123;uid&#125;</code>.</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-task-table">
            <thead>
              <tr>
                <th scope="col">Learner</th>
                <th scope="col">Task</th>
                <th scope="col">Due</th>
                <th scope="col">Priority</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan="5">Loading task records...</td></tr>}
              {!isLoading && !adminError && tasks.length === 0 && <tr><td colSpan="5">No Realtime Database tasks have been created yet.</td></tr>}
              {tasks.map((task) => (
                <tr key={`${task.ownerUid}-${task.id}`}>
                  <td>{userByUid[task.ownerUid]?.displayName || 'Deleted user'}</td>
                  <td>{task.title}</td>
                  <td>{formatTaskDueDate(task.dueDate)}</td>
                  <td>{task.priority}</td>
                  <td>{task.completed ? 'Completed' : 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
