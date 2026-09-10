# Learner Portal Architecture Guide

This guide is the quick map for finding code in the Learner Portal. It describes where code runs, why it lives there, and which file to change for each feature.

## Start Here

| Responsibility | File or folder | Why it lives there |
| --- | --- | --- |
| Starts React in the browser | `src/main.jsx` | Mounts the application once and imports the master styles. It should not contain feature logic. |
| Application entry composition | `src/App.jsx` | Imports and exports the router only, keeping the top-level entry predictable. |
| URLs, lazy loading, session access | `src/routes/PortalRouter.jsx` | Maps URLs to screens and loads a feature only when the learner visits it. |
| Protected-route decisions | `src/routes/RouteGuards.jsx` | Keeps login and role checks outside screen components. |
| Master visual variables and reset | `src/index.css` | Holds font, colour, spacing, and browser-wide defaults only. |
| Shared portal layout | `src/features/portal/PortalLayout.jsx` | Renders the persistent sidebar and the changing page area. |

`App.jsx` stays intentionally small. The router must contain React Router elements because routing is visual React work; Firebase calls and data calculations remain inside feature logic files and hooks.

## Screen Feature Map

Each feature follows the same separation pattern:

- `Feature.jsx` renders accessible markup and connects buttons or forms.
- `Feature.css` contains styles with that feature's unique class prefix.
- `feature.logic.js` contains validation, Firebase calls, calculation helpers, and constants.
- `useFeature.js` owns React state, subscriptions, and event handlers when a screen needs them.

| Screen | Main component | Data and behaviour |
| --- | --- | --- |
| Login | `src/features/auth/Login.jsx` | `authForm.logic.js` and `useAuthForm.js` validate and submit Firebase Authentication requests. |
| Registration | `src/features/auth/Registration.jsx` | Uses the same authentication logic, then Firebase creates the account. |
| Home | `src/features/home/HomeOverview.jsx` | `home.logic.js` and `useHomeOverview.js` assemble current summaries. |
| Learning | `src/features/learning/LearningContent.jsx` | Firestore course selection and lesson-completion records. |
| Learner Progress | `src/features/progress/LearnerProgress.jsx` | Teacher/Admin-only progress view. |
| Task Manager | `src/features/tasks/TaskManager.jsx` | Realtime Database REST CRUD and evidence log. |
| Support Bookings | `src/features/support/SupportBookings.jsx` | Firestore learner requests and Teacher/Admin status updates. |
| Document Library | `src/features/documents/DocumentLibrary.jsx` | Firebase Storage files and Firestore file metadata. |
| Admin Database | `src/features/admin/AdminDatabase.jsx` | Admin-only Firebase Auth directory and read-only task view. |

## Firebase Services

| Service | What it holds | Related code |
| --- | --- | --- |
| Firebase Authentication | Email/password account, unique UID, display name, managed session, Custom Claims | `src/features/auth/`, `src/firebase.js` |
| Realtime Database | Learner task records at `/tasks/{uid}/{taskId}` | `src/features/tasks/taskManager.logic.js`, `database.rules.json` |
| Cloud Firestore | Course selections, lesson progress, learner summaries, support bookings, and document metadata | `firestore.rules`, relevant feature folders |
| Cloud Storage | Private document file bytes at `documents/{uid}/{documentId}` | `src/features/documents/`, `storage.rules` |
| Cloud Functions | Trusted role assignment and Admin-only user directory work | `functions/index.js` |

## Role Assignment Flow

The correct spelling is **role**. A role is a trusted permission level: `student`, `teacher`, or `admin`.

```text
Registration
    ↓
Firebase Authentication creates an account with a unique UID
    ↓
Cloud Function: assignDefaultStudentRole
    ↓
Firebase Admin SDK writes { role: 'student' } as a Custom Claim for that UID
    ↓
Learner signs in again / refreshes their ID token
    ↓
React adapts the interface; Firebase Rules enforce the actual permission
```

### Functions in `functions/index.js`

| Function | Trigger | Result |
| --- | --- | --- |
| `assignDefaultStudentRole` | Firebase Auth account creation | Automatically assigns the least-privileged `student` Custom Claim using the new account's UID. This background trigger does not return a response to React. |
| `assignRole` | Admin-only callable request | Changes another account's role after checking the caller is an Admin; returns the target UID and role. |
| `listPortalUsers` | Admin-only callable request | Returns a restricted Firebase Auth user directory: UID, username, email, role, and active/disabled state. |

The browser must never assign its own role. `functions/index.js` runs in Firebase's trusted Cloud Functions environment, and it uses the Firebase Admin SDK there. This is why role changes are safe from browser tampering.

### Where roles appear

- The authenticated user's current role appears beneath their username in the sidebar.
- The Admin Database screen displays every Firebase Authentication user with their UID, email, and Custom Claim role.
- The role is **not copied into Firestore or Realtime Database**. Firebase Auth Custom Claims remain the single source of truth, preventing a learner from changing a database field to promote themselves.

If an assessor specifically requires a database user-profile record, add it only from Cloud Functions as a non-authoritative mirror. Firebase Rules and all permission decisions must continue to use the Custom Claim, never that copied database field.

## Lazy Loading

`src/routes/PortalRouter.jsx` uses `lazy()` for each page screen. The browser first downloads the Login journey and shared application code. It downloads Home, Tasks, Documents, Support, and other page files only when the learner opens that route. `Suspense` shows the `Loading your portal...` fallback while a route is loading.

## Styling

- `src/index.css` is the master stylesheet: reset, font, colour variables, fluid spacing variables, and page-wide defaults.
- Each feature owns its visual styles, for example `src/features/documents/DocumentLibrary.css`.
- `src/styles/portal.css` is a compatibility stylesheet from before the component refactor. New feature-specific styling belongs in the matching feature CSS file so it can be progressively moved out of this shared file.

## Practical “Where Do I Change This?” Guide

| Need to change | First place to open |
| --- | --- |
| Add or remove a sidebar item | `src/features/portal/portal.logic.js` |
| Add a new URL/screen | `src/routes/PortalRouter.jsx` |
| Change sign-in or registration validation | `src/features/auth/authForm.logic.js` |
| Change access by role | `functions/index.js`, `firestore.rules`, `database.rules.json`, and `src/routes/RouteGuards.jsx` |
| Change document type/size limits | `src/features/documents/documentLibrary.logic.js`, `firestore.rules`, and `storage.rules` together |
| Change task fields or REST logic | `src/features/tasks/taskManager.logic.js` and `database.rules.json` together |
| Change Support Booking status workflow | `src/features/support/supportBookings.logic.js` and `firestore.rules` together |

## Safety Rules to Remember

- Passwords are handled only by Firebase Authentication. Do not put them in source code, cookies, local storage, session storage, Firestore, Realtime Database, or Cloud Storage.
- The Firebase Auth UID identifies the account. Use it for ownership paths and trusted Admin SDK operations.
- React can hide or show a button based on a role, but Firebase Rules and Cloud Functions are the real security boundary.
- After a Custom Claim changes, the affected person must sign out and sign in again so their refreshed Firebase ID token includes the new role.
