# Realtime Database Security Review

## Purpose and data structure

The assessment task records now live in Firebase Realtime Database, separately from the existing Firestore document-library and learning-progress data.

```
/tasks
  /{ownerUid}
    /{taskId}
      title: string (1–120 characters)
      category: string (1–40 characters)
      dueDate: YYYY-MM-DD string
      priority: low | medium | high
      completed: boolean
      createdAt: Firebase server timestamp
      updatedAt: Firebase server timestamp
```

Using the authenticated user's UID as the parent key means ownership comes from the protected database path, not from an editable `owner` field supplied by the browser.

## Access policy

| Caller | Read own tasks | Write own tasks | Read all tasks | Change another user's tasks |
| --- | --- | --- | --- | --- |
| Signed-in student | Yes | Yes | No | No |
| Teacher | Yes | Yes | No | No |
| Admin | Yes | Yes | Yes | No |
| Signed-out visitor | No | No | No | No |

The Admin-only `/admin` page reads the complete `/tasks` branch. It also retrieves the Auth user directory through a protected Cloud Function. Email addresses and roles are never copied into Realtime Database.

## Rule safeguards

- Everything is denied by default at the database root.
- A learner can read only `/tasks/{theirUid}`.
- A task write must happen inside the signed-in learner's own UID path.
- An Admin custom claim can read `/tasks` for the protected directory page; this does **not** grant the ability to change another learner's tasks.
- Creates and updates must contain the exact approved fields. Extra fields are rejected.
- Titles, the four approved categories, dates, priority values, booleans, and server timestamps are validated by the database, not only by React.
- `createdAt` is immutable. `updatedAt` must be the server's current timestamp on every update.
- The browser uses a Firebase ID token only in a one-time REST request. It is never logged, downloaded, stored by this app, or included in the evidence file.

## Risk review and next hardening steps

- **Cross-user reads/writes:** blocked by UID comparisons and the Admin-claim check.
- **Claim forgery:** blocked because Realtime Database receives claims only in signed Firebase ID tokens; React does not create claims.
- **Unexpected fields:** blocked by the `$other` validation rule.
- **Invalid task data:** blocked by both front-end feedback and database validation. Database rules remain the final authority.
- **Excessive task creation:** this starter rule set has no per-user quota. Add an abuse/rate-limiting layer if the portal is opened beyond assessed users.
- **Administrator directory data:** email addresses are obtained only from the Admin SDK callable Function, which verifies the caller's `admin` claim server-side. Keep that function's deployment and Custom Claims workflow restricted to trusted administrators.

## Required deployment and checks

1. Publish `database.rules.json` with `firebase deploy --only database` (or deploy it together with Functions).
2. Sign in as a student and confirm that `/tasks/{anotherUid}` is denied.
3. Sign in as an Admin and confirm the Admin database page can read the `/tasks` parent and list Auth users.
4. Confirm that an Admin cannot edit another learner's task through the client: the write rule still requires the task owner's UID.
5. Capture the four REST CRUD operations using `REST_CRUD_EVIDENCE.md`.

This is a deliberately scoped assessment rule set. Review it again before expanding the task schema, exposing the app to untrusted public traffic, or adding any new top-level Realtime Database path.
