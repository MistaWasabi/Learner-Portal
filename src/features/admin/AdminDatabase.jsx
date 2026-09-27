import { formatTaskDueDate } from '../shared/portal.logic'
import { assignableRoles } from './admin.logic'
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
    roleForm,
    isAssigningRole,
    roleAssignmentError,
    roleAssignmentSuccess,
    taskCountByOwner,
    userByUid,
    loadAdminData,
    handleRoleFieldChange,
    handleRoleAssignment,
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

        {/* This form sends a request only; the Admin-only Cloud Function validates the caller and writes the Custom Claim. */}
        <form className="admin-role-form" onSubmit={handleRoleAssignment} noValidate>
          <div className="admin-role-form-heading">
            <h3>Role management</h3>
            <p>Choose a Firebase account and assign its Custom Claim. The request runs in Cloud Functions; this browser cannot write roles directly.</p>
          </div>
          <label className="admin-role-field" htmlFor="admin-role-user">
            User
            {/* The option value is the immutable Firebase UID, avoiding role changes based on a display name or mutable email. */}
            <select id="admin-role-user" name="targetUid" value={roleForm.targetUid} onChange={handleRoleFieldChange} disabled={isLoading || isAssigningRole}>
              <option value="">Choose a Firebase user</option>
              {portalUsers.map((portalUser) => (
                <option key={portalUser.uid} value={portalUser.uid}>{portalUser.displayName} — {portalUser.email || portalUser.uid}</option>
              ))}
            </select>
          </label>
          <label className="admin-role-field" htmlFor="admin-role-value">
            Role
            <select id="admin-role-value" name="role" value={roleForm.role} onChange={handleRoleFieldChange} disabled={isLoading || isAssigningRole}>
              {assignableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <button className="admin-role-submit-button" type="submit" disabled={isLoading || isAssigningRole}>
            {isAssigningRole ? 'Assigning role...' : 'Assign role'}
          </button>
        </form>

        {roleAssignmentError && <p className="admin-role-error" role="alert">{roleAssignmentError}</p>}
        {/* The success message includes the Cloud Function response so an Admin can verify the exact account that changed. */}
        {roleAssignmentSuccess && <p className="admin-role-success" role="status">{roleAssignmentSuccess}</p>}

        {/* This directory is populated by an Admin-only Cloud Function, so Firebase Auth emails never come from a client database read. */}
        <div className="admin-table-wrap">
          <table className="admin-user-table">
            <thead><tr><th scope="col">Username</th><th scope="col">Firebase UID</th><th scope="col">Email address</th><th scope="col">Role</th><th scope="col">Tasks</th><th scope="col">Account</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan="6">Loading protected administrator data...</td></tr>}
              {!isLoading && !adminError && portalUsers.length === 0 && <tr><td colSpan="6">No Firebase Authentication users were found.</td></tr>}
              {portalUsers.map((portalUser) => (
                <tr key={portalUser.uid}>
                  <td>{portalUser.displayName}</td>
                  <td>{portalUser.uid}</td>
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
        {/* Task records remain read-only here: learner CRUD stays in Task Manager and Realtime Database Rules enforce ownership. */}
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
