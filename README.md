Repo at
https://github.com/MistaWasabi/Learner-Portal


How to get the project Going
1. Open Terminal (Learner-Portal)
2. run "npm i"
3. run "npm run dev"


Firebase Setup
1. Copy `.env.example` and rename the copy to `.env.local`
2. Add the Firebase Web App settings from Firebase Console into `.env.local`
3. In Firebase Console, enable Authentication → Email/Password
4. Publish the Firestore rules: `npx -y firebase-tools@latest deploy --only firestore:rules --project learner-portal-b7224`
5. Create or select the Realtime Database instance, then add its exact URL as `VITE_FIREBASE_DATABASE_URL` in `.env.local` and restart Vite.
6. Create the default Firebase Storage bucket, then publish its owner-only rules: `npx -y firebase-tools@latest deploy --only storage --project learner-portal-b7224`
7. Publish the Realtime Database rules and Cloud Functions: `npx -y firebase-tools@latest deploy --only database,functions --project learner-portal-b7224`


What the App has Currently
- Login and Registration through Firebase Authentication
- Home Screen with a persistent side bar
- Task Manager using Realtime Database REST CRUD (`POST`, `GET`, `PATCH`, and `DELETE`)
- Document Library using private Firebase Storage uploads and Firestore metadata
- Learning Courses and Lesson Completion
- Learner Progress Screen
- Admin Database page showing all Firebase Authentication users, roles, email addresses, and read-only task records
- Support Booking for learner requests and Teacher/Admin status management


Code Structure
- `App.jsx` is the import-only application entry point.
- `routes/` owns URL mapping, lazy screen loading, and protected-route components.
- Every feature folder keeps its visual `.jsx`, feature CSS, non-visual `.logic.js`, and (where state is needed) a `useFeatureName.js` hook together.
- Firebase Authentication, Firestore listeners/writes, Realtime Database REST requests, calculations, and validation live outside visual JSX files.
- JSX files focus on accessible markup and connecting buttons/forms to their feature hook.
- See `ARCHITECTURE.md` for the full code map, Firebase-service map, role-assignment flow, and “where do I change this?” guide.


Important
- Login is controlled by Firebase Users
- Login survives refreshes during the current browser session, then ends when the browser session ends
- Passwords are never stored in Firestore, cookies, local storage, session storage, or source code
- Firebase manages the session-only authentication credential needed to restore a login; the app does not write credentials or profile data to browser storage
- Learner Progress can be seen only by users with a Firebase Custom Claim of `admin` or `teacher`
- The Admin Database page and user directory can be seen only by an `admin` Custom Claim
- Task records are stored at `/tasks/{uid}/{taskId}` in Realtime Database. Learners can manage their own records; an Admin can read every task but cannot edit another learner's task.
- The Task Manager's **Download log** button exports credential-free REST request evidence. Use `REST_CRUD_EVIDENCE.md` to record screenshots and verification results.
- `REALTIME_DATABASE_SECURITY_REVIEW.md` explains the data structure, published rules, permission boundary, and future hardening work.


Custom Roles
1. Deploy the Functions and Firestore rules after following the commands below.
2. In Firebase Console, open Project settings → Service accounts and create a private key. Keep its JSON file outside this project.
3. In PowerShell, set the file path for this terminal only: `$env:FIREBASE_SERVICE_ACCOUNT_PATH = 'C:\path\to\service-account.json'`
4. Seed the initial admin: `node .\functions\scripts\set-role.mjs admin aidanbeckley83@gmail.com`
5. To promote a teacher later: `node .\functions\scripts\set-role.mjs teacher teacher@example.com`
6. A person whose role changes must sign out and sign in again before their new Custom Claim is available in the app.
