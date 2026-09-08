import { getStaffNextStatuses, formatSupportBookingTime, supportTopics } from './supportBookings.logic'
import { useSupportBookings } from './useSupportBookings'
import './SupportBookings.css'

/**
 * Shows the learner's booking form and private requests. Teachers and Admins additionally receive the staff queue.
 * The hook owns Firestore calls so this component stays focused on accessible booking controls and role-aware display.
 */
export function SupportBookings({ user, role }) {
  const {
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
  } = useSupportBookings(user, role)

  return (
    <div className="support-bookings">
      <section className="dashboard-card support-booking-request" aria-labelledby="support-booking-heading">
        <div className="support-booking-heading">
          <div>
            <h2 id="support-booking-heading">Book learning support</h2>
            <p>Send a private support request with a preferred date and time. Your request is visible to you and authorised support staff only.</p>
          </div>
        </div>

        <form className="support-booking-form" onSubmit={handleBookingSubmit} noValidate>
          <div className="support-booking-field">
            <label htmlFor="support-topic">Support topic</label>
            <select id="support-topic" name="topic" value={bookingForm.topic} onChange={handleBookingFieldChange}>
              {supportTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
            </select>
          </div>
          <div className="support-booking-field">
            <label htmlFor="support-preferred-date">Preferred date</label>
            <input id="support-preferred-date" name="preferredDate" type="date" value={bookingForm.preferredDate} onChange={handleBookingFieldChange} />
          </div>
          <div className="support-booking-field">
            <label htmlFor="support-preferred-time">Preferred time</label>
            <input id="support-preferred-time" name="preferredTime" type="time" step="1800" value={bookingForm.preferredTime} onChange={handleBookingFieldChange} />
          </div>
          <div className="support-booking-field support-booking-details-field">
            <label htmlFor="support-details">How can we help?</label>
            <textarea id="support-details" name="details" value={bookingForm.details} onChange={handleBookingFieldChange} maxLength="1000" placeholder="Briefly describe the support you need." />
          </div>
          <button className="support-booking-submit-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Sending request...' : 'Send support request'}
          </button>
        </form>

        {bookingError && <p className="support-booking-error" role="alert">{bookingError}</p>}
        {bookingSuccess && <p className="support-booking-success" role="status">{bookingSuccess}</p>}
      </section>

      <section className="dashboard-card support-booking-own-list" aria-labelledby="my-support-bookings-heading">
        <div className="support-booking-heading">
          <div>
            <h2 id="my-support-bookings-heading">My support requests</h2>
            <p>Track updates to your own requests. You may cancel a request until it has been completed or cancelled.</p>
          </div>
        </div>

        {loadError && <p className="support-booking-error" role="alert">{loadError}</p>}
        <div className="support-booking-list" aria-live="polite">
          {isLoading && <p className="support-booking-empty">Loading your support requests...</p>}
          {!isLoading && !loadError && ownBookings.length === 0 && <p className="support-booking-empty">No support requests yet. Send your first request above.</p>}
          {ownBookings.map((booking) => (
            <article className="support-booking-item" key={booking.id}>
              <div>
                <div className="support-booking-item-title">
                  <h3>{booking.topic}</h3>
                  <span className={`support-booking-status support-booking-status-${booking.status}`}>{booking.status}</span>
                </div>
                <p className="support-booking-time">Preferred: {formatSupportBookingTime(booking.preferredAt)}</p>
                <p>{booking.details}</p>
                {booking.staffNote && <p className="support-booking-staff-note"><strong>Staff update:</strong> {booking.staffNote}</p>}
              </div>
              <div className="support-booking-owner-actions">
                {(booking.status === 'requested' || booking.status === 'confirmed') && (
                  <button className="support-booking-cancel-button" type="button" onClick={() => handleBookingCancel(booking)} disabled={cancellingBookingId === booking.id}>
                    {cancellingBookingId === booking.id ? 'Cancelling...' : 'Cancel request'}
                  </button>
                )}
                <button className="support-booking-delete-button" type="button" onClick={() => handleBookingDelete(booking)} disabled={deletingBookingId === booking.id}>
                  {deletingBookingId === booking.id ? 'Deleting...' : 'Delete request'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isStaff && (
        <section className="dashboard-card support-booking-staff-list" aria-labelledby="staff-support-bookings-heading">
          <div className="support-booking-heading">
            <div>
              <h2 id="staff-support-bookings-heading">Support staff queue</h2>
              <p>Teacher and Admin roles can review the latest 100 requests and record the next valid status. Learner emails are not stored in these booking records.</p>
            </div>
          </div>

          {staffError && <p className="support-booking-error" role="alert">{staffError}</p>}
          <div className="support-booking-list" aria-live="polite">
            {!staffError && staffBookings.length === 0 && <p className="support-booking-empty">No support requests are waiting for staff action.</p>}
            {staffBookings.map((booking) => {
              const nextStatuses = getStaffNextStatuses(booking.status)
              const draft = staffDrafts[booking.id] ?? { status: '', staffNote: booking.staffNote || '' }
              const isTerminal = nextStatuses.length === 0

              return (
                <article className="support-booking-item support-booking-staff-item" key={booking.id}>
                  <div>
                    <div className="support-booking-item-title">
                      <h3>{booking.learnerName} · {booking.topic}</h3>
                      <span className={`support-booking-status support-booking-status-${booking.status}`}>{booking.status}</span>
                    </div>
                    <p className="support-booking-time">Preferred: {formatSupportBookingTime(booking.preferredAt)}</p>
                    <p>{booking.details}</p>
                  </div>
                  {isTerminal ? (
                    <p className="support-booking-terminal">This request has reached a final status.</p>
                  ) : (
                    <div className="support-booking-staff-controls">
                      <label htmlFor={`support-status-${booking.id}`}>Next status</label>
                      <select id={`support-status-${booking.id}`} value={draft.status} onChange={(event) => handleStaffDraftChange(booking.id, 'status', event.target.value)}>
                        <option value="">Choose an action</option>
                        {nextStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <label htmlFor={`support-note-${booking.id}`}>Staff note (optional)</label>
                      <textarea id={`support-note-${booking.id}`} value={draft.staffNote} onChange={(event) => handleStaffDraftChange(booking.id, 'staffNote', event.target.value)} maxLength="500" placeholder="Add a useful update for the learner." />
                      <button className="support-booking-staff-save-button" type="button" onClick={() => handleStaffBookingUpdate(booking)} disabled={updatingBookingId === booking.id}>
                        {updatingBookingId === booking.id ? 'Saving update...' : 'Save staff update'}
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
