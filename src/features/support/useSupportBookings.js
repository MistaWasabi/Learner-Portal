import { useEffect, useState } from 'react'
import { isSupportStaff } from '../auth/auth.logic'
import {
  cancelSupportBooking,
  createEmptySupportBooking,
  createSupportBooking,
  deleteSupportBooking,
  getStaffNextStatuses,
  getSupportBookingError,
  subscribeToSupportBookings,
  updateSupportBookingAsStaff,
  validateSupportBooking,
} from './supportBookings.logic'

/** Keeps support-booking form state, Firestore listeners, and staff workflow out of SupportBookings.jsx. */
export function useSupportBookings(user, role) {
  const [bookingForm, setBookingForm] = useState(createEmptySupportBooking)
  const [ownBookings, setOwnBookings] = useState([])
  const [staffBookings, setStaffBookings] = useState([])
  const [staffDrafts, setStaffDrafts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [cancellingBookingId, setCancellingBookingId] = useState('')
  const [deletingBookingId, setDeletingBookingId] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')
  const [loadError, setLoadError] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')
  const [staffError, setStaffError] = useState('')
  const isStaff = isSupportStaff(role)

  useEffect(() => {
    // Listener callbacks, rather than the effect body, update state when Firestore provides new data or an error.
    return subscribeToSupportBookings(user, role, {
      onOwnBookings: (bookings) => {
        setOwnBookings(bookings)
        setLoadError('')
        setIsLoading(false)
      },
      onStaffBookings: (bookings) => {
        setStaffBookings(bookings)
        setStaffDrafts((currentDrafts) => Object.fromEntries(bookings.map((booking) => [
          booking.id,
          currentDrafts[booking.id] ?? { status: '', staffNote: booking.staffNote || '' },
        ])))
        setStaffError('')
      },
      onOwnError: (error) => {
        setLoadError(getSupportBookingError(error, 'load'))
        setIsLoading(false)
      },
      onStaffError: (error) => setStaffError(getSupportBookingError(error, 'load')),
    })
  }, [user, role])

  /** Updates one plain-text booking form field without mutating the prior form object. */
  function handleBookingFieldChange(event) {
    const { name, value } = event.target
    setBookingForm((currentBooking) => ({ ...currentBooking, [name]: value }))
    setBookingError('')
    setBookingSuccess('')
  }

  /** Validates and writes a new learner-owned support request, then removes its form values from React state. */
  async function handleBookingSubmit(event) {
    event.preventDefault()
    setBookingError('')
    setBookingSuccess('')

    const validation = validateSupportBooking(bookingForm)
    if (validation.error) {
      setBookingError(validation.error)
      return
    }

    try {
      setIsSaving(true)
      await createSupportBooking(user, bookingForm, validation.preferredAt)
      setBookingForm(createEmptySupportBooking())
      setBookingSuccess('Your support request was sent. Staff will update its status here.')
    } catch (error) {
      setBookingError(getSupportBookingError(error, 'save'))
    } finally {
      setIsSaving(false)
    }
  }

  /** Allows a learner to withdraw an active request while Firestore preserves a clear cancellation history. */
  async function handleBookingCancel(booking) {
    if (!window.confirm(`Cancel your ${booking.topic.toLowerCase()} support request?`)) return

    setBookingError('')
    setBookingSuccess('')
    try {
      setCancellingBookingId(booking.id)
      await cancelSupportBooking(booking.id)
      setBookingSuccess('Your support request was cancelled.')
    } catch (error) {
      setBookingError(getSupportBookingError(error, 'cancel'))
    } finally {
      setCancellingBookingId('')
    }
  }

  /** Lets a learner remove only their own request after a clear confirmation; Firestore Rules enforce the same ownership check. */
  async function handleBookingDelete(booking) {
    if (!window.confirm(`Delete your ${booking.topic.toLowerCase()} support request? This cannot be undone.`)) return

    setBookingError('')
    setBookingSuccess('')
    try {
      setDeletingBookingId(booking.id)
      await deleteSupportBooking(booking.id)
      setBookingSuccess('Your support request was deleted.')
    } catch (error) {
      setBookingError(getSupportBookingError(error, 'delete'))
    } finally {
      setDeletingBookingId('')
    }
  }

  /** Keeps each staff queue row independent so a note typed for one learner cannot affect another booking. */
  function handleStaffDraftChange(bookingId, fieldName, value) {
    setStaffDrafts((currentDrafts) => ({
      ...currentDrafts,
      [bookingId]: { ...currentDrafts[bookingId], [fieldName]: value },
    }))
    setStaffError('')
  }

  /** Submits a single Teacher/Admin status transition after the selected state is checked locally. */
  async function handleStaffBookingUpdate(booking) {
    const draft = staffDrafts[booking.id] ?? { status: '', staffNote: '' }
    if (!getStaffNextStatuses(booking.status).includes(draft.status)) {
      setStaffError('Choose one of the available next statuses before saving.')
      return
    }

    try {
      setUpdatingBookingId(booking.id)
      await updateSupportBookingAsStaff(user, booking.id, draft.status, draft.staffNote)
      setStaffDrafts((currentDrafts) => ({
        ...currentDrafts,
        [booking.id]: { status: '', staffNote: draft.staffNote },
      }))
    } catch (error) {
      setStaffError(getSupportBookingError(error, 'staff-update'))
    } finally {
      setUpdatingBookingId('')
    }
  }

  return {
    bookingForm,
    ownBookings,
    staffBookings,
    staffDrafts,
    isStaff,
    isLoading,
    isSaving,
    cancellingBookingId,
    deletingBookingId,
    updatingBookingId,
    loadError,
    bookingError,
    bookingSuccess,
    staffError,
    handleBookingFieldChange,
    handleBookingSubmit,
    handleBookingCancel,
    handleBookingDelete,
    handleStaffDraftChange,
    handleStaffBookingUpdate,
  }
}
