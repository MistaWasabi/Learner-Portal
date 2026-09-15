import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { isSupportStaff } from '../auth/auth.logic'
import { getLearnerDisplayName } from '../shared/portal.logic'

// These values are duplicated in Firestore Rules so the client and database agree on permitted data.
export const supportTopics = ['Course content', 'Assessment', 'Technical issue', 'Study plan']

const bookingStatuses = ['requested', 'confirmed', 'completed', 'cancelled']

/** Supplies fresh, non-sensitive form values whenever a booking is successfully saved. */
export function createEmptySupportBooking() {
  return {
    topic: supportTopics[0],
    preferredDate: '',
    preferredTime: '',
    details: '',
  }
}

/** Validates learner-entered booking details before a Firestore write is attempted. */
export function validateSupportBooking(booking) {
  if (!supportTopics.includes(booking.topic)) return { error: 'Choose a valid support topic.' }
  if (!booking.preferredDate) return { error: 'Choose a preferred date.' }
  if (!booking.preferredTime) return { error: 'Choose a preferred time.' }
  if (!booking.details.trim()) return { error: 'Describe the support you need.' }
  if (booking.details.trim().length > 1000) return { error: 'Support details must be 1,000 characters or fewer.' }

  // Combining the date and time creates one real Firestore timestamp instead of trusting a date-format string.
  const preferredAt = new Date(`${booking.preferredDate}T${booking.preferredTime}`)
  if (Number.isNaN(preferredAt.getTime())) return { error: 'Choose a valid preferred date and time.' }
  if (preferredAt.getTime() < Date.now()) return { error: 'Choose a preferred time in the future.' }

  return { preferredAt: Timestamp.fromDate(preferredAt) }
}

/** Maps Firestore snapshots to booking records and sorts client-side to avoid a composite index for the owner query. */
function mapBookings(snapshot) {
  return snapshot.docs
    .map((bookingSnapshot) => ({ id: bookingSnapshot.id, ...bookingSnapshot.data() }))
    .sort((firstBooking, secondBooking) => {
      const firstTime = firstBooking.createdAt?.toMillis?.() ?? 0
      const secondTime = secondBooking.createdAt?.toMillis?.() ?? 0
      return secondTime - firstTime
    })
}

/** Opens owner-only booking updates and, for staff, a separate all-bookings queue. */
export function subscribeToSupportBookings(user, role, { onOwnBookings, onStaffBookings, onOwnError, onStaffError }) {
  // This equality filter is required so Firestore can prove that a learner only receives their own records.
  const ownBookingsQuery = query(
    collection(db, 'supportBookings'),
    where('ownerUid', '==', user.uid),
  )
  const unsubscribeOwnBookings = onSnapshot(
    ownBookingsQuery,
    (snapshot) => onOwnBookings(mapBookings(snapshot)),
    onOwnError,
  )

  if (!isSupportStaff(role)) return unsubscribeOwnBookings

  // Staff claims permit the all-bookings queue; newest requests are shown first for practical triage.
  const staffBookingsQuery = query(
    collection(db, 'supportBookings'),
    orderBy('createdAt', 'desc'),
    // A bounded queue prevents one staff screen from loading an unbounded historical collection at once.
    limit(100),
  )
  const unsubscribeStaffBookings = onSnapshot(
    staffBookingsQuery,
    (snapshot) => onStaffBookings(mapBookings(snapshot)),
    onStaffError,
  )

  return () => {
    unsubscribeOwnBookings()
    unsubscribeStaffBookings()
  }
}

/** Creates a learner-owned request in the only valid initial state. */
export async function createSupportBooking(user, booking, preferredAt) {
  await addDoc(collection(db, 'supportBookings'), {
    ownerUid: user.uid,
    // This label is useful to staff but permissions are always based on the immutable UID, not this text.
    learnerName: getLearnerDisplayName(user),
    topic: booking.topic,
    preferredAt,
    details: booking.details.trim(),
    status: 'requested',
    staffNote: '',
    staffUid: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    staffUpdatedAt: null,
  })
}

/** Returns the permitted next statuses; terminal outcomes cannot be reopened through the interface. */
export function getStaffNextStatuses(currentStatus) {
  if (currentStatus === 'requested') return ['confirmed', 'cancelled']
  if (currentStatus === 'confirmed') return ['completed', 'cancelled']
  return []
}

/** Lets a learner safely withdraw only a request that is still active. */
export async function cancelSupportBooking(bookingId) {
  await updateDoc(doc(db, 'supportBookings', bookingId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  })
}

/** Permanently removes a learner's own request when they no longer need its support history. */
export async function deleteSupportBooking(bookingId) {
  await deleteDoc(doc(db, 'supportBookings', bookingId))
}

/** Lets a Teacher or Admin record one validated status transition and optional response note. */
export async function updateSupportBookingAsStaff(user, bookingId, nextStatus, staffNote) {
  if (!bookingStatuses.includes(nextStatus)) throw new Error('Choose a valid booking status.')
  if (staffNote.trim().length > 500) throw new Error('Staff notes must be 500 characters or fewer.')

  await updateDoc(doc(db, 'supportBookings', bookingId), {
    status: nextStatus,
    staffNote: staffNote.trim(),
    staffUid: user.uid,
    updatedAt: serverTimestamp(),
    staffUpdatedAt: serverTimestamp(),
  })
}

/** Formats a booking's Firestore timestamp for the learner and staff views without exposing raw database values. */
export function formatSupportBookingTime(timestamp) {
  if (!timestamp?.toDate) return 'Saving preferred time...'
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp.toDate())
}

/** Converts Firestore failures into short feedback that describes the relevant support-booking action. */
export function getSupportBookingError(error, action) {
  if (error.code === 'permission-denied') {
    return 'Firestore blocked this booking action. Check the published rules and your role.'
  }
  if (error.message === 'Choose a valid booking status.' || error.message === 'Staff notes must be 500 characters or fewer.') {
    return error.message
  }
  return action === 'load'
    ? 'Support bookings could not be loaded. Please try again.'
    : action === 'cancel'
      ? 'Your booking could not be cancelled. Please try again.'
      : action === 'delete'
        ? 'Your booking could not be deleted. Please try again.'
      : action === 'staff-update'
        ? 'The booking status could not be updated. Please try again.'
        : 'Your support booking could not be sent. Please try again.'
}
