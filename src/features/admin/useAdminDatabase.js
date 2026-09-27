import { useEffect, useMemo, useState } from 'react'
import {
  assignPortalUserRole,
  getAdminDatabaseError,
  getPortalUsersByUid,
  getRoleAssignmentError,
  getTaskCountByOwner,
  loadAdminDatabase,
} from './admin.logic'

/** Keeps sensitive Admin-directory loading state and Realtime Database calls out of the table component. */
export function useAdminDatabase(user) {
  const [portalUsers, setPortalUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [adminError, setAdminError] = useState('')
  const [restRequest, setRestRequest] = useState(null)
  // The form holds only temporary selection data; Custom Claims stay in Firebase Authentication rather than browser storage.
  const [roleForm, setRoleForm] = useState({ targetUid: '', role: 'student' })
  const [isAssigningRole, setIsAssigningRole] = useState(false)
  const [roleAssignmentError, setRoleAssignmentError] = useState('')
  const [roleAssignmentSuccess, setRoleAssignmentSuccess] = useState('')

  /** Applies a successful protected data result only while the requesting Admin view is still mounted. */
  function applyAdminData(result) {
    setPortalUsers(result.portalUsers)
    setTasks(result.tasks)
    setRestRequest(result.restRequest)
  }

  // Reload when the authenticated Admin changes so a previous person's email directory is never shown to the next account.
  useEffect(() => {
    let isCurrentAdmin = true

    loadAdminDatabase(user)
      .then((result) => {
        if (isCurrentAdmin) applyAdminData(result)
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

  /** Lets an Admin deliberately refresh the directory and all-task read without resetting the route. */
  async function loadAdminData() {
    setIsLoading(true)
    setAdminError('')

    try {
      applyAdminData(await loadAdminDatabase(user))
    } catch (error) {
      setAdminError(getAdminDatabaseError(error))
    } finally {
      setIsLoading(false)
    }
  }

  /** Updates one local Admin form choice without writing roles to a client-controlled database. */
  function handleRoleFieldChange(event) {
    const { name, value } = event.target
    setRoleForm((currentForm) => ({ ...currentForm, [name]: value }))
    setRoleAssignmentError('')
    setRoleAssignmentSuccess('')
  }

  /** Calls the trusted Cloud Function, displays its UID/role response, and then refreshes the protected directory. */
  async function handleRoleAssignment(event) {
    event.preventDefault()
    const selectedUser = portalUsers.find((portalUser) => portalUser.uid === roleForm.targetUid)

    if (!selectedUser) {
      setRoleAssignmentError('Select a current Firebase user before assigning a role.')
      return
    }

    if (!window.confirm(`Change ${selectedUser.displayName}'s role to ${roleForm.role}? They must sign out and sign in again before their new permissions apply.`)) return

    setRoleAssignmentError('')
    setRoleAssignmentSuccess('')

    try {
      setIsAssigningRole(true)
      const result = await assignPortalUserRole(roleForm.targetUid, roleForm.role)
      // The returned UID proves which Firebase Auth account changed, rather than trusting a display label.
      setRoleAssignmentSuccess(`${selectedUser.displayName} is now ${result.role}. Firebase UID: ${result.uid}. They must sign out and sign in again to refresh their permissions.`)
      setRoleForm({ targetUid: '', role: 'student' })

      try {
        applyAdminData(await loadAdminDatabase(user))
      } catch {
        // The role update already succeeded, so a refresh failure is never reported as a failed role change.
        setAdminError('The role changed successfully, but the directory could not refresh. Use Refresh data to see the new role.')
      }
    } catch (error) {
      setRoleAssignmentError(getRoleAssignmentError(error))
    } finally {
      setIsAssigningRole(false)
    }
  }

  const taskCountByOwner = useMemo(() => getTaskCountByOwner(tasks), [tasks])
  const userByUid = useMemo(() => getPortalUsersByUid(portalUsers), [portalUsers])

  return {
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
  }
}
