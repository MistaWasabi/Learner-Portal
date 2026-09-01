# Lesson Completion and Learner Progress - Firestore Rule Review

## Application data model and queries

- **Private selection path:** `users/{uid}/courseSelections/{courseId}`.
- **Private lesson completion path:** `users/{uid}/lessonProgress/{courseId--lessonId}`. Each document stores one completion record: `courseId`, `lessonId`, and `completedAt`.
- **Shared summary path:** `learnerProgress/{uid}`. Each document stores only `displayName`, `selectedCourseCount`, `totalSelectedLessons`, `completedLessonCount`, and `updatedAt`.
- **Shared query:** signed-in learners use `orderBy('updatedAt', 'desc')` on `learnerProgress`. This is a single-field sort, so Standard Firestore's automatic index is sufficient.
- **Data separation:** emails, Firebase Auth data, and private individual lesson records are never placed in the shared progress collection.

## Rule decisions

- Private selections and completions require the path UID to equal the authenticated UID.
- Completion documents are one document per lesson rather than a client-written array. This lets the rules validate each known course-and-lesson pair and its predictable document ID.
- Course-selection and completion updates are disabled. The app creates a record to complete something and deletes it to mark it incomplete.
- `learnerProgress` is readable by authenticated users because the current requirement explicitly asks to display all learners. It has no email, UID field, or private lesson details.
- Only the matching user can create or update their own summary. Strict validation limits names, numeric ranges, allowed fields, and recent server timestamps.

## Devil's advocate review

| Attempt | Expected result |
| --- | --- |
| Unauthenticated visitor lists shared progress | Denied because even the shared view requires Firebase Authentication. |
| Learner reads another learner's individual lesson completions | Denied because every `users/{uid}/lessonProgress` read requires the matching UID. |
| Learner writes a completion for an unknown course or lesson | Denied by the known course-and-lesson validator. |
| Learner writes a valid lesson with a mismatched document ID | Denied because the document ID must equal `courseId--lessonId`. |
| Learner adds a role, email, or arbitrary field to a completion or summary | Denied by strict `hasOnly` schemas. |
| Learner changes a completion timestamp or lesson ID after creation | Denied because lesson-progress updates are disabled. |
| Learner writes a huge display name or invalid negative total | Denied by the 50-character name limit and numeric ranges. |
| Learner writes a completed lesson total larger than the selected total | Denied by the summary validator. |
| Learner writes a stale or future timestamp | Denied by five-minute server-time validation. |
| Learner deletes someone else's progress record | Denied because the path UID must match the authenticated UID. |
| Learner attempts to list private user subcollections globally | Denied because private paths require their exact owner UID. |

## Publish and verify

1. Open **Firestore Database → Rules** in Firebase Console.
2. Replace the rules with the contents of `firestore.rules` and publish.
3. Sign in, select a course, mark a lesson complete, and open **Learner progress**.
4. Sign in with a second account to confirm that only username and aggregate totals are visible there.

The shared progress view is intentionally broader than the final planned role design. Revisit these rules when Custom Claims are added so read access can be restricted to the appropriate role.
