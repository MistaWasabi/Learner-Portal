# Learner Support Portal - Project Brief Memory

This is a concise, working reference distilled from the supplied **Two Month JavaScript Programmer Formative and Summative Project** brief. It intentionally covers sections 1-3.2 and 7-7.4 only; the fill-in questions are excluded.

## Product Goal

Build a browser-based Learner Support Portal for SkillsTrack Training Centre. Learners must be able to manage their learning tasks, request support, review calculated progress, use resources, and complete a small coding game. The application must use JavaScript, Firebase data, REST communication, and Git/GitHub practices.

## Required Users

- **Learner:** registers and signs in, manages only their own tasks, books support, views progress, plays the game, and prints a progress summary.
- **Assessor/administrator:** views relevant bookings and learner activity, and may update booking status when that is included in the approved scope.

## Core Functional Scope

- Firebase Authentication: registration, sign-in, sign-out, clear validation feedback, and protected personal features.
- Dashboard: calculate and show task totals, completed work, outstanding work, overdue work, and progress from real task data.
- Task manager: create, read, edit, mark complete, and delete tasks. Deletion needs confirmation.
- Support booking: a validated booking form with useful success/error feedback.
- Search/filter/sort: use arrays, higher-order functions, and reusable functions to work with tasks or resources.
- Preference: save, read, change, and remove one **non-sensitive** cookie preference (for example, theme or display mode).
- Print and redirect: provide a printable progress summary and use redirects only where they are justified by the user flow.
- Engagement: one JavaScript-timer animation, controlled image/audio/video, and an assessor-approved playable JavaScript mini-game that records its result.

## Firebase and Security Requirements

- Use Firebase Realtime Database (not only Firebase Authentication) with a planned structure and secure rules.
- Suggested paths: `users/{uid}`, `tasks/{taskId}`, `bookings/{bookingId}`, `scores/{scoreId}`, and optional `resources/{resourceId}`.
- Store ownership through the authenticated user's UID, and ensure rules limit users to data appropriate to their identity and role.
- Implement and document Firebase REST CRUD: `POST`, `GET`, `PUT` or `PATCH`, `DELETE`, then a final verification read.
- Never store passwords in the database, cookies, source code, or GitHub. Firebase Authentication owns password handling.
- Do not commit secrets, private credentials, or service-account files. Keep local configuration out of Git.
- Validate user input before sending it to Firebase. Database security rules are still required; client validation alone is not sufficient.

## Month 2 Delivery Checklist

- [ ] Completed, usable Learner Support Portal matching the approved brief.
- [x] Firebase Authentication with registration, sign-in, sign-out, and session-gated content.
- [x] Firebase Realtime Database with structured, owner-based task records and published security rules.
- [x] REST CRUD for learner tasks (`POST`, `GET`, `PATCH`, `DELETE`), with an in-app safe request log and final verification GET after each mutation. Complete the screenshot fields in `REST_CRUD_EVIDENCE.md` during the live demonstration.
- [x] Support Booking with validated learner requests, private learner tracking, and Teacher/Admin staff status updates.
- [ ] ES6 classes, object instances, and an inheritance or composition relationship.
- [ ] Validation for names, email, passwords, numeric fields, and required data.
- [ ] Error handling with `try`, `catch`, `finally`, and at least one deliberately thrown custom error.
- [ ] Dynamic interface creation, updates, and removals.
- [ ] Timer animation and controlled multimedia.
- [ ] Approved playable mini-game with a Firebase-stored score or outcome.
- [ ] GitHub evidence of branches, commits, pull requests, reviews, and merges for each contributor.
- [ ] Final test report, improved README, contribution report, assessor review, and learner reflection.

## Current Project Decisions to Preserve

- Add clear comments around meaningful code blocks, functions, state, rules, and styles. Comments should explain both **what** the code does and **why** that approach is appropriate, especially for Firebase, security, and data decisions.
- Use Firebase Authentication for user registration and sign-in.
- Store a registered learner's username in their Firebase Auth `displayName` and show it in the sidebar.
- Use Firebase's browser-session persistence so a learner stays signed in after refreshing a page, but is signed out when the browser session ends. Firebase manages the session credential required for this; the app must not write credentials or profile data to browser storage itself.
- Clear the password field after an authentication attempt. Do not use cookies, local storage, session storage, or source code for passwords. Firebase Authentication owns password handling and its managed session credential.
- When a cookie preference is later added for the assessment, limit it to a harmless setting such as theme. It must never store a password or replace Firebase's managed session rule.

## Week 1 Demo Feedback and Agreed Technical Direction

This section records the Week 1 feedback so it guides future changes rather than becoming a separate, forgotten list.

### Front-end structure and styling

- Keep global CSS only for the reset, font, colour variables, and page-wide defaults. Do not turn ordinary visual styling into one large reusable styling component.
- Refactor `App.jsx` into the application shell: it should configure routes, load shared providers, and place persistent layout pieces such as the authenticated sidebar. Feature screens must live outside it.
- Use React Router for URL-based navigation. Route-level lazy loading should load a feature only when it is visited, improving the initial load of the portal.
- Split each visual feature into its own folder, for example `features/auth/Login/`, `features/auth/Registration/`, and `features/home/Landing/`. Each visual component should own a `.jsx` file and a matching `.css` file.
- Put non-visual feature logic in a nearby `.js` file. The JSX file should focus on rendering and event wiring, while validation, Firestore/Firebase calls, calculations, and helper functions are imported from the logic file.
- Use a unique CSS naming prefix for each component (for example, `login-`, `registration-`, and `sidebar-`) so independently developed styles cannot clash. This is especially important while using regular CSS rather than CSS Modules.
- Apply a documented coding standard: descriptive camelCase variables/functions, PascalCase React components/classes, small focused files, consistent comments that explain both what code does and why it was chosen, and no unused code.

### Authentication, roles, and testing

- Implement custom claims as an early security milestone. Use claims such as `role: 'learner'` and later `role: 'assessor'`; the React client may read claims to adapt the interface, but it must never create or change them.
- Assign custom claims only with the Firebase Admin SDK in a trusted environment, preferably a Cloud Function. Firebase rules must enforce the role boundary; hiding a button in React is not security.
- Add email verification before allowing a learner to enrol in multi-factor authentication. Use a disposable test inbox such as EmailOnDeck only for development testing, never as an administrator or production account.
- Plan two-factor authentication as Firebase multi-factor authentication, not as a password stored or generated by this app. Firebase's web MFA options require Firebase Authentication with Identity Platform and support SMS or TOTP factors; the implementation needs a separate testing and privacy review.

### File uploads and Firebase Storage

- Firebase Storage is approved through the Blaze plan. New uploads use an owner-only Storage path and strict type/size rules.
- Document bytes are stored at `documents/{uid}/{documentId}` in Firebase Storage. Firestore stores only title, Storage path, MIME type, size, and upload time at `users/{uid}/documents/{documentId}`.
- The library never stores a password, email, or download URL. It requests a Firebase download URL only after the owner asks to download the file, then does not persist that URL in app state or browser storage.

### Recommended implementation order from this feedback

1. Introduce React Router and extract the current screens from `App.jsx` without changing user-visible behaviour.
2. Move feature logic out of visual components and scope existing CSS with unique class prefixes.
3. Add the trusted Cloud Function/custom-claim workflow, then use role-aware rules and UI.
4. Add verified-email handling and plan/test MFA with safe test accounts.
5. Enable Firebase Storage only after the billing decision, then build secure file upload and deletion.

## Week 2 Feedback and Current Technical Position

- **Automatic role assignment:** Implemented in `functions/index.js` as `assignDefaultStudentRole`. It runs in the cloud when Firebase Authentication creates an account, uses the new account's unique UID, and assigns the safe default `student` Custom Claim through the Firebase Admin SDK.
- **Privileged role-change call:** Implemented as the Admin-only `assignRole` callable Cloud Function. It checks the caller's Admin claim, finds the target by email, writes the Custom Claim against the target UID, and returns the UID and assigned role.
- **Role visibility:** The Admin Database page receives UID, email, and role directly from the protected `listPortalUsers` Cloud Function. Roles are intentionally not copied to a client-writable database user table because Custom Claims are the permission source of truth.
- **Cloud execution:** All trusted Cloud Functions are centralised in `functions/index.js`. React calls only the protected callable functions it needs; it never imports the Admin SDK or changes roles locally.
- **Component refactor:** `src/App.jsx` is now import-only. `src/main.jsx` starts React and imports the master styles. Route composition and lazy loading live in `src/routes/PortalRouter.jsx`; focused feature folders own their visual JSX, CSS, logic, and hooks.
- **Lazy loading:** Every route-level screen uses React `lazy()`, so it is downloaded only when the user navigates to it.
- **Master styles:** `src/MasterStyles.css` holds global reset, tokens, form defaults, and shared visual primitives. Each feature owns its own screen styling; the former compatibility stylesheet has been removed.
- **Documentation:** `ARCHITECTURE.md` is the codebase map for future work and assessment explanation.

## Future Firebase Knowledge and Architecture

- **Custom claims:** learn how Firebase Auth custom claims represent trusted roles such as `learner`, `assessor`, or `admin`. They must be assigned only by the Firebase Admin SDK in a trusted environment, such as a Cloud Function; React must never assign its own claims.
- **Cloud Functions:** learn how server-side Firebase functions connect trusted cloud work to this React application. Typical uses are assigning custom claims, performing privileged actions, and responding to Firebase events without exposing administrator credentials in the browser.
- **Using claims in React:** keep the signed-in user and claim data in one application-level Auth context/hook so any React component can identify the current user and role. Claims come from the Firebase ID token and are not an instant live database lookup, so refresh the token after an authorised claim change. UI role checks improve the experience, but Firebase security rules and Cloud Functions must enforce the real permission boundary.
- **Cloud Firestore:** become familiar with Firestore as a non-relational document database organised into collections, documents, and optional subcollections. For this assessment, the specified database remains **Firebase Realtime Database** unless the assessor approves a change; Firestore is additional knowledge, not a replacement by default.

## Current Firestore Document Library

- `/documents` includes a private Document Library, with a condensed count on Home.
- A learner uploads PDF, Word, OpenDocument, RTF, or plain-text files up to 10 MiB. The file bytes are stored in Firebase Storage; Firestore saves only private metadata at `users/{uid}/documents/{documentId}`.
- Users can download or permanently delete only their own files. Deleting a document removes the Storage file and the matching Firestore metadata.
- `firestore.rules`, `storage.rules`, and `DOCUMENT_STORAGE_RULES_REVIEW.md` document the prototype owner-only protections. Firestore and Storage Rules are both published; they should still be tested with separate learner accounts before broad sharing.

## Current Realtime Database Task Manager

- Tasks are stored at `/tasks/{uid}/{taskId}` in Realtime Database, rather than in Firestore.
- The Task Manager uses authenticated Firebase REST requests for `POST`, `GET`, `PATCH`, and `DELETE`; every write is followed by a final `GET` verification.
- Learners can add, read, edit, complete, filter, and delete only their own tasks. An Admin can read all task paths through the protected Admin Database screen, but cannot modify another learner's record.
- The Home-page task totals read from the same Realtime Database REST path so the dashboard and Task Manager agree.
- The original Firestore task rule remains owner-only, but the interface no longer uses that old task collection. Do not delete legacy Firestore records until you have reviewed whether they are needed.

## Current Administrator Directory

- `/admin` is an Admin-only route protected in React and again in Firebase.
- `listPortalUsers` is a callable Cloud Function that uses the Firebase Admin SDK to retrieve every Firebase Authentication user in pages.
- It returns only the required directory fields: UID, username, email address, Custom Claim role, and disabled/active state. This data is never copied into Firestore or Realtime Database.
- The Realtime Database rules grant an Admin read-only access to all task paths. The Cloud Function separately verifies the Admin claim before returning email addresses.

## Current Support Booking

- `/support` is available to every authenticated user through the persistent sidebar and is also summarised on the Home page.
- A learner creates a validated support request with topic, preferred date/time, and support details. The booking is stored in Firestore at `supportBookings/{bookingId}`.
- A booking stores the learner's immutable Firebase UID, a short display name, its preferred timestamp, status, timestamps, and an optional staff note. It deliberately stores no learner email address.
- Learners can list only their own bookings, may cancel a request while it is `requested` or `confirmed`, and may permanently delete only their own request after confirmation.
- Teacher and Admin Custom Claims can see the latest 100 requests in a staff queue and update a request only through these transitions: `requested → confirmed/cancelled` and `confirmed → completed/cancelled`.
- Firestore Rules enforce ownership, allowed fields, string-size limits, immutable original booking details, trusted staff claims, and the permitted status workflow. `SUPPORT_BOOKING_RULES_REVIEW.md` records the model and security review.

## Suggested Build Order

1. Capture the live REST CRUD screenshots and downloaded safe logs using `REST_CRUD_EVIDENCE.md`.
2. Add a printable progress summary and a safe non-sensitive preference cookie.
3. Test Support Booking with Student, Teacher, and Admin accounts after the published Firestore Rules update.
4. Add verified-email handling and plan/test Firebase multi-factor authentication with a disposable development inbox.
5. Add the assessment-approved animation/multimedia feature and playable JavaScript mini-game with a recorded outcome.
6. Capture GitHub collaboration, debugging/refactoring, testing, and reflection evidence as development proceeds.

## Assessment Reminder

The learner must be able to explain, test, and modify the submitted work. Treat this file as a guide, not as a replacement for understanding the code and keeping individual contribution evidence.
