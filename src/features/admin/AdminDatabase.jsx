import { formatTaskDueDate } from '../shared/portal.logic'
import { useAdminDatabase } from './useAdminDatabase'
import './AdminDatabase.css'

/** Renders protected Admin-only data; the hook keeps user-directory and all-task reads out of JSX. */
export function AdminDatabase({ user }) {
  const {
    portalUsers,
    tasks,
    isLoading,
    adminError,
    restRequest,
    taskCountByOwner,
    userByUid,
    loadAdminData,
  } = useAdminDatabase(user)

  return (
    <div className="admin-database">
      <section className="dashboard-card admin-directory" aria-labelledby="admin-directory-heading">
        <div className="admin-section-heading">
          <div>
            <h2 id="admin-directory-heading">Administrator database</h2>
            <p>Firebase Authentication users and Realtime Database tasks. Email addresses are visible only to verified Admin claims.</p>
          </div>
          <button className="admin-refresh-button" type="button" onClick={loadAdminData} disabled={isLoading}>{isLoading ? 'Refreshing...' : 'Refresh data'}</button>
        </div>

        {adminError && <p className="error admin-status" role="alert">{adminError}</p>}
        {!adminError && restRequest && <p className="admin-rest-status" role="status">Realtime Database {restRequest.method} {restRequest.path} returned {restRequest.status}.</p>}

        <div className="admin-table-wrap">
          <table className="admin-user-table">
            <thead><tr><th scope="col">Username</th><th scope="col">Email address</th><th scope="col">Role</th><th scope="col">Tasks</th><th scope="col">Account</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan="5">Loading protected administrator data...</td></tr>}
              {!isLoading && !adminError && portalUsers.length === 0 && <tr><td colSpan="5">No Firebase Authentication users were found.</td></tr>}
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
        <div className="admin-section-heading"><div><h2 id="admin-task-records-heading">All learner tasks</h2><p>Read-only overview of every user-owned task stored at <code>/tasks/&#123;uid&#125;</code>.</p></div></div>
        <div className="admin-table-wrap">
          <table className="admin-task-table">
            <thead><tr><th scope="col">Learner</th><th scope="col">Task</th><th scope="col">Due</th><th scope="col">Priority</th><th scope="col">State</th></tr></thead>
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
