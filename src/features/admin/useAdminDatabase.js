import { useEffect, useMemo, useState } from 'react'
import { getAdminDatabaseError, getPortalUsersByUid, getTaskCountByOwner, loadAdminDatabase } from './admin.logic'

/** Keeps sensitive Admin-directory loading state and Realtime Database calls out of the table component. */
export function useAdminDatabase(user) {
  const [portalUsers, setPortalUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [adminError, setAdminError] = useState('')
  const [restRequest, setRestRequest] = useState(null)

  /** Applies a successful protected data result only while the requesting Admin view is still mounted. */
  function applyAdminData(result) {
    setPortalUsers(result.portalUsers)
    setTasks(result.tasks)
    setRestRequest(result.restRequest)
  }

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

  const taskCountByOwner = useMemo(() => getTaskCountByOwner(tasks), [tasks])
  const userByUid = useMemo(() => getPortalUsersByUid(portalUsers), [portalUsers])

  return {
    portalUsers,
    tasks,
    isLoading,
    adminError,
    restRequest,
    taskCountByOwner,
    userByUid,
    loadAdminData,
  }
}
