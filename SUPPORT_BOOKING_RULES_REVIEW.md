# Support Booking Firestore Rules Review

This working review records the access pattern used before adding the `supportBookings` collection to Firestore Rules. It is intentionally separate from application code so the data model and permission decisions can be reviewed.

## Target Firestore Instance

- Firebase project: `learner-portal-b7224`
- Existing database edition: Standard
- Client: React application using the Firebase modular Web SDK

## Existing Firestore Access Patterns

- `users/{uid}/documents/{documentId}`: owner-only Firebase Storage metadata, ordered by `createdAt`.
- `users/{uid}/courseSelections/{courseId}`: owner-only course selections.
- `users/{uid}/lessonProgress/{courseId--lessonId}`: owner-only lesson records.
- `learnerProgress/{uid}`: written by its owner and read only by Teacher/Admin claims.

## Support Booking Model

Collection: `supportBookings/{bookingId}`

Required fields:

- `ownerUid`: authenticated learner UID; immutable.
- `learnerName`: short Firebase display name for staff readability; no email is stored.
- `topic`: one approved support topic.
- `preferredAt`: appointment preference as a Firestore timestamp.
- `details`: learner request text, limited to 1,000 characters.
- `status`: `requested`, `confirmed`, `completed`, or `cancelled`.
- `staffNote`: optional staff response, limited to 500 characters.
- `staffUid`: empty on creation; the responding staff member's UID after a staff update.
- `createdAt`, `updatedAt`, `staffUpdatedAt`: server-managed timestamps, with `staffUpdatedAt` initially `null`.

## Required Access Pattern

- Any authenticated user can create a booking only for their own UID, with the initial `requested` state.
- A learner can query only bookings where `ownerUid == their UID`; the client uses that exact query.
- A learner can cancel only their own `requested` or `confirmed` booking, or permanently delete only their own booking after an explicit confirmation. Staff cannot delete booking records.
- Teacher and Admin claims can query all booking records and progress statuses according to the approved state transitions.
- A Student cannot query another learner's record, edit the appointment details after creation, impersonate staff, or set a privileged role.

## Devil's-Advocate Rule Review

The following rule-tracing audit was completed after the rule change. A separate live test with Student and Teacher/Admin accounts remains appropriate before broad sharing.

| Attempt | Audit result | Rule protection |
| --- | --- | --- |
| Unauthenticated list or write | Rejected by rule tracing | `isAuthenticated()` is required everywhere. |
| Student reads another learner's booking | Rejected by rule tracing | Read requires `resource.data.ownerUid == request.auth.uid`. |
| Student creates a booking owned by someone else | Rejected by rule tracing | `ownerUid` must equal `request.auth.uid` on create. |
| Student creates a pre-confirmed booking | Rejected by rule tracing | Creation requires `status == 'requested'`, empty staff fields, and no staff timestamp. |
| Student changes topic, time, details, or owner after creation | Rejected by rule tracing | Learner updates are limited to `requested/confirmed → cancelled`; core fields are immutable. |
| Student deletes another learner's booking | Rejected by rule tracing | Delete requires the stored `ownerUid` to equal `request.auth.uid`. |
| Learner deletes their own booking | Allowed by rule tracing | Delete is limited to the matching authenticated owner and is confirmed in the interface. |
| Student adds arbitrary fields or oversized text | Rejected by rule tracing | Strict `hasOnly`, required fields, types, and string limits are validated on create and update. |
| Student impersonates a Teacher/Admin | Rejected by rule tracing | Staff permission comes only from Firebase Auth Custom Claims. |
| Staff modifies a completed/cancelled booking | Rejected by rule tracing | Terminal statuses have no allowed outgoing transition. |
| Staff changes learner ownership or original request details | Rejected by rule tracing | Staff updates preserve immutable learner-owned fields. |
| Very large staff queue read | Bounded in client | The staff query loads the latest 100 records rather than an unbounded collection. |

```json
{
  "score": 4,
  "summary": "The Support Booking path uses authenticated ownership, trusted Custom Claims for staff, strict schemas, immutable core request fields, and controlled status transitions. It is a strong prototype suitable for the current portal, subject to live role-account testing before broad release.",
  "findings": [
    {
      "check": "Identity display label",
      "severity": "minor",
      "issue": "learnerName is a length-limited display label supplied by the signed-in client. Access control does not depend on it; immutable ownerUid is the authority.",
      "recommendation": "If staff require verified learner names at larger scale, derive the label in a trusted Cloud Function or validate it against an updated Firebase Auth token claim."
    }
  ]
}
```

The rules compiled successfully and were released to the Firebase project. They remain a prototype that should be manually tested with Student and Teacher/Admin accounts and reviewed again before the portal is broadly shared.
