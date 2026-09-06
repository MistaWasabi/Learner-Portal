# Course Selection Firestore Rule Review

## Scope and data model

- **Path:** `users/{userId}/courseSelections/{courseId}`.
- **Reads:** the signed-in learner listens only to their own `courseSelections` subcollection; there are no filters or ordering requirements.
- **Create:** selecting a course creates a document whose ID and `courseId` must be the same known catalogue ID. It also stores `enrolledAt` with a server timestamp.
- **Update:** disabled. A learner removes and re-adds a selection instead of changing its enrolment timestamp or course ID.
- **Delete:** a learner may remove only a selection in their own path.
- **Shared content:** course titles, descriptions, and lessons are static application content in this first learner-focused version. They are not client-writable Firestore records.

## Prototype-rule attack review

| Attempt | Expected outcome |
| --- | --- |
| Unauthenticated visitor lists course selections | Denied because every action requires Firebase Authentication. |
| Learner reads another learner's course selections | Denied because `userId` must equal `request.auth.uid`. |
| Learner creates a selection for an unknown course | Denied because `courseId` must be one of the three fixed catalogue values. |
| Learner writes a selection whose document ID differs from `courseId` | Denied because the rule requires them to match. |
| Learner adds a role, note, or arbitrary extra field | Denied by the strict two-field schema. |
| Learner writes a non-timestamp, old, or future enrolment time | Denied by timestamp and five-minute recency checks. |
| Learner changes the selection after creating it | Denied because updates are disabled. |
| Learner deletes another learner's selection | Denied because the path owner must match the signed-in UID. |
| Learner alters shared course descriptions or lessons in Firestore | Not possible in this version because shared content has no client-writable Firestore path. |

## Publish and test

1. In the Firebase Console, open **Firestore Database → Rules**.
2. Replace the existing rules with `firestore.rules` from this project, then publish.
3. Sign in, open **Learning**, add a course, refresh the data view by changing screens, and remove the course again.

These rules are a prototype and should be reviewed again before adding administrator-managed course content, enrolment by another person, Custom Claims, or lesson completion records.
