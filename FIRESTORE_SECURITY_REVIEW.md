# Firestore Document-Link Library - Security Review

## What the application uses

- **Firestore path:** `users/{uid}/documents/{documentId}`.
- **Query:** the signed-in learner listens only to their own subcollection, ordered by `createdAt` descending.
- **Writes:** the application creates a new document-link record. It does not update the record in this first version.
- **Files:** Firebase does not receive file bytes. A learner stores an external HTTPS link, such as a Google Drive document link.
- **Task path:** `users/{uid}/tasks/{taskId}`.
- **Task query:** the signed-in learner listens only to their own tasks, ordered by `createdAt` descending.
- **Task actions:** create, read, edit, mark complete, filter in the browser, and delete after confirmation.

## Record shape

Every Firestore record contains `name`, `url`, and `createdAt`. The Firestore rules require all three fields, reject unexpected fields, limit title and URL lengths, require HTTPS, and require a recent server timestamp.

Every task record contains `title`, `category`, `dueDate`, `priority`, `completed`, and `createdAt`. The rules use the same strict validator for creates and updates, restrict priority values, keep `createdAt` immutable after creation, and scope each task to its owner's path.

## Prototype-rule attack review

| Attempt | Expected rule outcome |
| --- | --- |
| Unauthenticated user lists records | Denied: every action requires Firebase Authentication. |
| Learner opens another learner's path | Denied: path `userId` must match `request.auth.uid`. |
| Learner writes an oversized or unexpected record | Denied: title/URL limits, strict field checks, HTTPS validation, and timestamp checks apply on create. |
| Learner changes metadata later | Denied: updates are intentionally disabled; the learner must delete and save a replacement link. |
| Learner deletes another learner's record | Denied: the path `userId` must match `request.auth.uid`. |
| Learner adds a role or arbitrary field | Denied: the strict schema permits only the three defined fields. |
| Learner creates an invalid task or extra task field | Denied: task schema, type, priority, and date-format checks apply. |
| Learner changes a task's creation date | Denied: `createdAt` must remain unchanged on updates. |
| Learner edits or deletes another learner's task | Denied: the path `userId` must match `request.auth.uid`. |

## Publishing checklist

1. In Firebase Console, confirm the Firestore database edition. This code and the rules are written for the normal **Standard** Firestore Web SDK flow; tell the developer if your console says Enterprise.
2. In **Firestore Database → Rules**, copy the contents of `firestore.rules`, then publish the rules.
3. Sign in to the portal and save a secure document link to test the complete path.

These are prototype rules designed to make each learner's document data private and schema-limited. Review and verify them before broadly sharing the app; they should be hardened again when document sharing, deletion, roles, or administrator features are added.
