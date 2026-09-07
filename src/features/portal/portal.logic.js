import { canViewLearnerProgress, getRoleLabel, isAdmin } from '../auth/auth.logic'

// One route definition keeps sidebar links and page headings consistent without duplicating labels in JSX.
const portalNavigation = [
  { path: '/home', label: 'Home' },
  { path: '/learning', label: 'Learning' },
  { path: '/progress', label: 'Learner progress', requiresProgressAccess: true },
  { path: '/admin', label: 'Admin database', requiresAdminAccess: true },
  { path: '/tasks', label: 'Task manager' },
  { path: '/documents', label: 'Document library' },
]

/** Returns only the navigation destinations permitted by the signed Firebase Custom Claim. */
export function getVisiblePortalNavigation(role) {
  return portalNavigation.filter((item) => (
    (!item.requiresProgressAccess || canViewLearnerProgress(role)) &&
    (!item.requiresAdminAccess || isAdmin(role))
  ))
}

/** Uses the shared route definition to produce the persistent layout's heading. */
export function getActivePortalScreenLabel(pathname) {
  return portalNavigation.find((item) => item.path === pathname)?.label ?? 'Learner Portal'
}

/** Formats safe Firebase profile/claim data for the sidebar without exposing an email address. */
export function getSidebarUserDetails(user, role) {
  return {
    userName: user.displayName?.trim() || 'Learner',
    roleLabel: getRoleLabel(role),
  }
}
