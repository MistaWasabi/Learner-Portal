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
- [ ] Firebase Realtime Database with structured records and secure rules.
- [ ] REST CRUD for one main entity (recommended: learner tasks), with request evidence and final read-back.
- [ ] ES6 classes, object instances, and an inheritance or composition relationship.
- [ ] Validation for names, email, passwords, numeric fields, and required data.
- [ ] Error handling with `try`, `catch`, `finally`, and at least one deliberately thrown custom error.
- [ ] Debugging/refactoring evidence showing an issue before and after correction.
- [ ] Dynamic interface creation, updates, and removals.
- [ ] Timer animation and controlled multimedia.
- [ ] Approved playable mini-game with a Firebase-stored score or outcome.
- [ ] GitHub evidence of branches, commits, pull requests, reviews, and merges for each contributor.
- [ ] Final test report, improved README, contribution report, assessor review, and learner reflection.

## Current Project Decisions to Preserve

- Add clear comments around meaningful code blocks, functions, state, rules, and styles. Comments should explain both **what** the code does and **why** that approach is appropriate, especially for Firebase, security, and data decisions.
- Use Firebase Authentication for user registration and sign-in.
- Store a registered learner's username in their Firebase Auth `displayName` and show it in the sidebar.
- Keep authentication memory-only so refreshing returns the user to Login.
- Clear the password field after an authentication attempt. Do not use cookies, local storage, or source code for passwords or sensitive session data.
- When a cookie preference is later added for the assessment, limit it to a harmless setting such as theme. It must never change the memory-only authentication rule.

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

- Replace the current external document-link approach with Firebase Storage only after the project owner has approved the billing upgrade. Cloud Storage for Firebase currently requires the Blaze plan, although no-cost usage allowances may still apply.
- When Storage is approved, create owner-only Storage Rules before any upload interface. Store document metadata such as title, owner UID, upload time, and Storage path in Firestore; store file bytes only in the Storage bucket.
- Keep the current document-link library available until the Storage migration is complete, so the portal continues to work without a paid Storage bucket.

### Recommended implementation order from this feedback

1. Introduce React Router and extract the current screens from `App.jsx` without changing user-visible behaviour.
2. Move feature logic out of visual components and scope existing CSS with unique class prefixes.
3. Add the trusted Cloud Function/custom-claim workflow, then use role-aware rules and UI.
4. Add verified-email handling and plan/test MFA with safe test accounts.
5. Enable Firebase Storage only after the billing decision, then build secure file upload and deletion.

## Future Firebase Knowledge and Architecture

- **Custom claims:** learn how Firebase Auth custom claims represent trusted roles such as `learner`, `assessor`, or `admin`. They must be assigned only by the Firebase Admin SDK in a trusted environment, such as a Cloud Function; React must never assign its own claims.
- **Cloud Functions:** learn how server-side Firebase functions connect trusted cloud work to this React application. Typical uses are assigning custom claims, performing privileged actions, and responding to Firebase events without exposing administrator credentials in the browser.
- **Using claims in React:** keep the signed-in user and claim data in one application-level Auth context/hook so any React component can identify the current user and role. Claims come from the Firebase ID token and are not an instant live database lookup, so refresh the token after an authorised claim change. UI role checks improve the experience, but Firebase security rules and Cloud Functions must enforce the real permission boundary.
- **Cloud Firestore:** become familiar with Firestore as a non-relational document database organised into collections, documents, and optional subcollections. For this assessment, the specified database remains **Firebase Realtime Database** unless the assessor approves a change; Firestore is additional knowledge, not a replacement by default.

## Current Firestore Document Library

- The Home page includes a private Document Library.
- Firestore saves the link record at `users/{uid}/documents/{documentId}`; each learner reads only their own subcollection.
- A record contains a title, an external HTTPS document link, and a creation date. Firebase does not store the document file itself.
- `firestore.rules` is a prototype owner-only rule set that must be reviewed and published in the Firebase Console before document links will work.

## Current Firestore Task Manager

- The Home page includes a private Task Manager at `users/{uid}/tasks/{taskId}`.
- Learners can add, read, edit, complete, filter, and delete only their own tasks.
- The Firestore version demonstrates non-relational, user-owned CRUD. The separate assessment requirement for Realtime Database REST CRUD remains outstanding.

## Suggested Build Order

1. Create the Realtime Database structure and identity-based security rules.
2. Build the task entity and complete its Firebase REST CRUD workflow.
3. Replace temporary dashboard values with calculated task data.
4. Add search/filter/sort, task-delete confirmation, and printable progress summary.
5. Add the support-booking flow, then the preference, animation/multimedia, and game.
6. Capture testing, REST, GitHub collaboration, debugging, and refactoring evidence as development proceeds.

## Assessment Reminder

The learner must be able to explain, test, and modify the submitted work. Treat this file as a guide, not as a replacement for understanding the code and keeping individual contribution evidence.
